import { Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { emitToGroup, inGroups, loadGroup, participantAccess, pushToGroup } from '../services/fingleGroup.js'

const ALLOWED_EMOJIS = ['👍', '👎', '🫶', '👌', '🤙', '🖕', '✌️', '🙌', '🤟', '🤘', '🙏']

// Toggling the same emoji off and on shouldn't re-notify everyone each time
const PUSH_COOLDOWN_MS = 60_000
const recentPushes = new Map<string, number>()

function shouldPush(key: string): boolean {
  const now = Date.now()
  const last = recentPushes.get(key)
  if (last && now - last < PUSH_COOLDOWN_MS) return false
  if (recentPushes.size > 1000) recentPushes.clear()
  recentPushes.set(key, now)
  return true
}

export async function toggleReaction(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params
  const { emoji } = req.body as { emoji?: string }

  if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
    res.status(400).json({ error: 'Invalid emoji' })
    return
  }

  const group = await loadGroup(id)
  if (!group) {
    res.status(404).json({ error: 'Challenge not found' })
    return
  }

  const access = participantAccess(group, req.userId!, 'reacting')
  if (!access.ok) {
    res.status(access.status).json({ error: access.error })
    return
  }

  const reactor = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, username: true },
  })

  // A reaction anywhere in the group counts — the thread is shared
  const mine = { userId: req.userId!, emoji, challenge: inGroups([group.groupId]) }
  const existing = await prisma.reaction.findFirst({ where: mine })

  if (existing) {
    await prisma.reaction.deleteMany({ where: mine })
    emitToGroup(group, 'reaction_updated', {
      challengeId: id,
      emoji,
      action: 'removed',
      reactionId: existing.id,
      byUserId: req.userId,
      byUsername: reactor?.username,
    })
    res.json({ action: 'removed', emoji })
    return
  }

  let reaction
  try {
    reaction = await prisma.reaction.create({
      data: { challengeId: access.challengeId, userId: req.userId!, emoji },
      include: { user: { select: { id: true, username: true } } },
    })
  } catch (err) {
    // A concurrent double-tap already added it
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.json({ action: 'added', emoji })
      return
    }
    console.error('[reactions] create failed:', err)
    res.status(500).json({ error: 'Could not add reaction' })
    return
  }

  emitToGroup(group, 'reaction_updated', {
    challengeId: id,
    emoji,
    action: 'added',
    reactionId: reaction.id,
    byUserId: req.userId,
    byUsername: reactor?.username,
  })

  if (shouldPush(`${req.userId}:${group.groupId}:${emoji}`)) {
    pushToGroup(group, req.userId!, {
      title: `${reactor?.username ?? 'Someone'} reacted ${emoji}`,
      body: 'Tap to see it',
    })
  }

  res.status(201).json({ action: 'added', reaction })
}
