import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { emitToUser } from './socket.js'
import { sendPushToUser } from './webpush.js'

/**
 * A "fingle" sent to several friends is stored as one Challenge row per
 * recipient, all sharing a groupId. Comments and reactions belong to the
 * group: everyone who can see the photo (the sender, plus any recipient who
 * has already guessed) sees and participates in the same thread.
 */

// Legacy rows created before groupId existed act as a group of one
export function groupKey(c: { id: string; groupId: string | null }): string {
  return c.groupId ?? c.id
}

// Matches every challenge in the given groups, including legacy ungrouped rows
export function inGroups(groupIds: string[]): Prisma.ChallengeWhereInput {
  return { OR: [{ groupId: { in: groupIds } }, { id: { in: groupIds } }] }
}

export interface GroupMember {
  challengeId: string
  receiverId: string
  guessed: boolean
}

export interface FingleGroup {
  groupId: string
  senderId: string
  // Earliest challenge in the group — where the sender's comments/reactions are stored
  anchorId: string
  members: GroupMember[]
}

export async function loadGroup(challengeId: string): Promise<FingleGroup | null> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, groupId: true, senderId: true },
  })
  if (!challenge) return null

  const groupId = groupKey(challenge)
  const rows = await prisma.challenge.findMany({
    where: inGroups([groupId]),
    select: { id: true, receiverId: true, guess: { select: { id: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })

  return {
    groupId,
    senderId: challenge.senderId,
    anchorId: rows[0]?.id ?? challenge.id,
    members: rows.map((r) => ({ challengeId: r.id, receiverId: r.receiverId, guessed: !!r.guess })),
  }
}

export type Access =
  | { ok: true; challengeId: string }
  | { ok: false; status: 403 | 404; error: string }

/**
 * Whether userId may comment/react on the group, and which of their challenge
 * rows the write should be attached to.
 */
export function participantAccess(group: FingleGroup, userId: string, action: string): Access {
  if (group.senderId === userId) return { ok: true, challengeId: group.anchorId }
  const member = group.members.find((m) => m.receiverId === userId)
  if (!member) return { ok: false, status: 404, error: 'Challenge not found' }
  // Receivers must guess first so the thread can't spoil the answer
  if (!member.guessed) return { ok: false, status: 403, error: `You must guess before ${action}` }
  return { ok: true, challengeId: member.challengeId }
}

interface Viewer {
  userId: string
  url: string
}

// Everyone who can currently see the photo and its thread, with a deep link to their own card
function viewers(group: FingleGroup): Viewer[] {
  const list: Viewer[] = [
    { userId: group.senderId, url: `/?tab=sent&highlight=${group.anchorId}` },
  ]
  for (const m of group.members) {
    if (m.guessed && m.receiverId !== group.senderId) {
      list.push({ userId: m.receiverId, url: `/?tab=inbox&highlight=${m.challengeId}` })
    }
  }
  return list
}

// Live-update every viewer's feed (including the actor's other devices)
export function emitToGroup(group: FingleGroup, event: string, data: object): void {
  for (const v of viewers(group)) {
    emitToUser(v.userId, event, { groupId: group.groupId, ...data })
  }
}

// Push-notify every viewer except the actor
export function pushToGroup(
  group: FingleGroup,
  actorId: string,
  payload: { title: string; body: string },
): void {
  for (const v of viewers(group)) {
    if (v.userId === actorId) continue
    sendPushToUser(v.userId, {
      ...payload,
      url: v.url,
      // Collapse repeat notifications for the same fingle into one
      tag: `fingle-${group.groupId}`,
    }).catch(() => {/* non-fatal */})
  }
}

/**
 * One-time, idempotent fix-up for challenges created before groupId existed.
 * A multi-recipient send uploaded the photo once, so rows sharing
 * sender + photoUrl belong to the same send.
 */
export async function backfillChallengeGroups(): Promise<void> {
  const grouped = await prisma.$executeRaw`
    UPDATE "Challenge" c SET "groupId" = g.gid
    FROM (
      SELECT id, FIRST_VALUE(id) OVER (PARTITION BY "senderId", "photoUrl" ORDER BY "createdAt", id) AS gid
      FROM "Challenge"
      WHERE "groupId" IS NULL
    ) g
    WHERE c.id = g.id`
  if (grouped === 0) return

  // Merging threads can leave the same user+emoji on two rows of one group — keep the earliest
  const deduped = await prisma.$executeRaw`
    DELETE FROM "Reaction" r
    USING (
      SELECT r2.id, ROW_NUMBER() OVER (
        PARTITION BY c."groupId", r2."userId", r2.emoji ORDER BY r2."createdAt", r2.id
      ) AS rn
      FROM "Reaction" r2
      JOIN "Challenge" c ON c.id = r2."challengeId"
    ) d
    WHERE r.id = d.id AND d.rn > 1`

  console.log(`[backfill] grouped ${grouped} challenges, removed ${deduped} duplicate reactions`)
}
