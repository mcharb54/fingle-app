import { prisma } from '../lib/prisma.js'
import { groupKey } from './fingleGroup.js'
import { levelFor, QUICK_DRAW_BONUS } from './scoring.js'

/**
 * Everything on the progress side of the game — levels, streaks, accuracy,
 * rivalries, badges — is derived from Guess and Challenge history, so it also
 * covers games played before these mechanics existed.
 */

export interface PlayerStats {
  xp: number
  level: number
  levelStart: number
  nextLevelAt: number
  hotStreak: number
  bestHotStreak: number
  daily: { days: number; todayDone: boolean; freezeUsedThisWeek: boolean }
  guesses: number
  perfects: number
  countCorrect: number
  quickDraws: number
  sent: number
  friendGuessesOnMine: number
  stumps: number
  stumperPoints: number
  fullStumpGroups: number
  title: string
}

interface BadgeDef {
  id: string
  name: string
  description: string
  earned: (s: PlayerStats) => boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'first_send', name: 'First fingle', description: 'Send your first fingle', earned: (s) => s.sent >= 1 },
  { id: 'first_guess', name: 'Taking a guess', description: 'Guess your first fingle', earned: (s) => s.guesses >= 1 },
  { id: 'bullseye', name: 'Bullseye', description: 'Get the count and the fingers right', earned: (s) => s.perfects >= 1 },
  { id: 'mind_reader', name: 'Mind reader', description: 'Get 10 perfects', earned: (s) => s.perfects >= 10 },
  { id: 'on_fire', name: 'On fire', description: 'Score on 5 guesses in a row', earned: (s) => s.bestHotStreak >= 5 },
  { id: 'week_straight', name: 'Week straight', description: 'Play 7 days in a row', earned: (s) => s.daily.days >= 7 },
  { id: 'quick_draw', name: 'Quick draw', description: 'Earn the quick-draw bonus 5 times', earned: (s) => s.quickDraws >= 5 },
  { id: 'trickster', name: 'Trickster', description: 'Stump friends 5 times', earned: (s) => s.stumps >= 5 },
  { id: 'stumped_em_all', name: "Stumped 'em all", description: 'Send to 2+ friends and nobody gets the count', earned: (s) => s.fullStumpGroups >= 1 },
]

// ---------- calendar days in the player's own timezone ----------

export function safeTimezone(tz: unknown): string | null {
  if (typeof tz !== 'string' || tz.length > 64) return null
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz })
    return tz
  } catch {
    return null
  }
}

function dayKey(date: Date, tz: string): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function prevDay(key: string): string {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Monday of the key's week, so each calendar week gets one freeze
function weekKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

/**
 * Consecutive days with a guess or a send, ending today (or yesterday if today
 * hasn't been played yet). One missed day per calendar week is forgiven.
 */
export function dailyStreak(activity: Date[], tz: string, now = new Date()) {
  const active = new Set(activity.map((d) => dayKey(d, tz)))
  const today = dayKey(now, tz)
  const todayDone = active.has(today)
  const thisWeek = weekKey(today)

  let cursor = todayDone ? today : prevDay(today)
  let days = 0
  const frozenWeeks = new Set<string>()
  let pendingFreeze: string | null = null
  let freezeUsedThisWeek = false

  for (let i = 0; i < 800; i++) {
    if (active.has(cursor)) {
      days++
      // A freeze only counts once the streak carries on past it
      if (pendingFreeze) {
        frozenWeeks.add(pendingFreeze)
        if (pendingFreeze === thisWeek) freezeUsedThisWeek = true
        pendingFreeze = null
      }
    } else {
      const wk = weekKey(cursor)
      if (pendingFreeze || frozenWeeks.has(wk)) break
      pendingFreeze = wk
    }
    cursor = prevDay(cursor)
  }

  return { days, todayDone, freezeUsedThisWeek }
}

/** Store the client's timezone (sent as X-Timezone) so streak days match the player's calendar. */
export async function rememberTimezone(userId: string, header: unknown): Promise<void> {
  const tz = safeTimezone(header)
  if (!tz) return
  await prisma.user.updateMany({
    where: { id: userId, OR: [{ timezone: null }, { timezone: { not: tz } }] },
    data: { timezone: tz },
  })
}

// ---------- stats ----------

function titleFor(s: Pick<PlayerStats, 'guesses' | 'perfects' | 'countCorrect' | 'friendGuessesOnMine' | 'stumps'>): string {
  if (s.guesses >= 10 && s.perfects / s.guesses >= 0.6) return 'Mind reader'
  if (s.friendGuessesOnMine >= 10 && s.stumps / s.friendGuessesOnMine >= 0.5) return 'Trickster'
  if (s.guesses >= 10 && s.countCorrect / s.guesses >= 0.75) return 'Sharpshooter'
  if (s.guesses >= 10) return 'Regular'
  return 'Rookie'
}

const basePoints = (g: { points: number; quickDraw: boolean }) => g.points - (g.quickDraw ? QUICK_DRAW_BONUS : 0)

async function loadHistory(userId: string) {
  const [user, myGuesses, guessesOnMine, sentRows] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { totalScore: true, timezone: true } }),
    prisma.guess.findMany({
      where: { userId },
      select: { points: true, quickDraw: true, isCountCorrect: true, isFingersCorrect: true, createdAt: true, challenge: { select: { senderId: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.guess.findMany({
      where: { challenge: { senderId: userId } },
      select: { userId: true, points: true, quickDraw: true, isCountCorrect: true, senderPoints: true },
    }),
    prisma.challenge.findMany({
      where: { senderId: userId },
      select: { id: true, groupId: true, createdAt: true, guess: { select: { isCountCorrect: true } } },
    }),
  ])
  return { user, myGuesses, guessesOnMine, sentRows }
}

type History = Awaited<ReturnType<typeof loadHistory>>

function statsFrom({ user, myGuesses, guessesOnMine, sentRows }: History): PlayerStats {
  // Scoring guesses in a row, most recent run and best run
  let run = 0
  let bestHotStreak = 0
  for (const g of myGuesses) {
    run = g.points > 0 ? run + 1 : 0
    bestHotStreak = Math.max(bestHotStreak, run)
  }

  const groups = new Map<string, { total: number; guessed: number; cracked: number }>()
  for (const c of sentRows) {
    const g = groups.get(groupKey(c)) ?? { total: 0, guessed: 0, cracked: 0 }
    g.total++
    if (c.guess) g.guessed++
    if (c.guess?.isCountCorrect) g.cracked++
    groups.set(groupKey(c), g)
  }

  const counts = {
    guesses: myGuesses.length,
    perfects: myGuesses.filter((g) => g.isCountCorrect && g.isFingersCorrect).length,
    countCorrect: myGuesses.filter((g) => g.isCountCorrect).length,
    friendGuessesOnMine: guessesOnMine.length,
    stumps: guessesOnMine.filter((g) => basePoints(g) < 30).length,
  }

  return {
    xp: user.totalScore,
    ...levelFor(user.totalScore),
    hotStreak: run,
    bestHotStreak,
    daily: dailyStreak(
      [...myGuesses.map((g) => g.createdAt), ...sentRows.map((c) => c.createdAt)],
      user.timezone ?? 'UTC',
    ),
    ...counts,
    quickDraws: myGuesses.filter((g) => g.quickDraw).length,
    sent: groups.size,
    stumperPoints: guessesOnMine.reduce((sum, g) => sum + g.senderPoints, 0),
    fullStumpGroups: [...groups.values()].filter((g) => g.total >= 2 && g.guessed === g.total && g.cracked === 0).length,
    title: titleFor(counts),
  }
}

export async function computeStats(userId: string): Promise<PlayerStats> {
  return statsFrom(await loadHistory(userId))
}

/** Award any badges the player now qualifies for; returns only the new ones. */
export async function awardBadges(userId: string, stats?: PlayerStats) {
  const s = stats ?? (await computeStats(userId))
  const have = new Set((await prisma.userBadge.findMany({ where: { userId }, select: { badge: true } })).map((b) => b.badge))
  const fresh = BADGES.filter((b) => !have.has(b.id) && b.earned(s))
  if (fresh.length === 0) return []
  await prisma.userBadge.createMany({ data: fresh.map((b) => ({ userId, badge: b.id })), skipDuplicates: true })
  return fresh.map(({ id, name, description }) => ({ id, name, description }))
}

export async function badgeList(userId: string) {
  const earned = new Map(
    (await prisma.userBadge.findMany({ where: { userId } })).map((b) => [b.badge, b.earnedAt]),
  )
  return BADGES.map(({ id, name, description }) => ({ id, name, description, earnedAt: earned.get(id) ?? null }))
}

/** Per-friend record: how often each of you cracked (got the count of) the other's fingles. */
export async function headToHead(userId: string) {
  const friendRows = await prisma.friend.findMany({
    where: { status: 'ACCEPTED', OR: [{ initiatorId: userId }, { receiverId: userId }] },
    include: {
      initiator: { select: { id: true, username: true, avatarUrl: true, totalScore: true } },
      receiver: { select: { id: true, username: true, avatarUrl: true, totalScore: true } },
    },
  })
  const friends = friendRows.map((f) => (f.initiatorId === userId ? f.receiver : f.initiator))
  const ids = friends.map((f) => f.id)

  const [mine, theirs] = await Promise.all([
    prisma.guess.findMany({ where: { userId, challenge: { senderId: { in: ids } } }, select: { isCountCorrect: true, challenge: { select: { senderId: true } } } }),
    prisma.guess.findMany({ where: { userId: { in: ids }, challenge: { senderId: userId } }, select: { userId: true, isCountCorrect: true } }),
  ])

  return friends
    .map((friend) => {
      const a = mine.filter((g) => g.challenge.senderId === friend.id)
      const b = theirs.filter((g) => g.userId === friend.id)
      return {
        friend,
        youCracked: a.filter((g) => g.isCountCorrect).length,
        theirFingles: a.length,
        theyCracked: b.filter((g) => g.isCountCorrect).length,
        yourFingles: b.length,
      }
    })
    .sort((x, y) => y.theirFingles + y.yourFingles - (x.theirFingles + x.yourFingles))
}
