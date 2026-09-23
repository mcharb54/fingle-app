import { randomUUID } from 'crypto'
import { Response } from 'express'
import multer from 'multer'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { uploadPhoto } from '../services/cloudinary.js'
import { emitToUser } from '../services/socket.js'
import { sendPushToUser } from '../services/webpush.js'
import { groupKey, inGroups } from '../services/fingleGroup.js'
import { FINGER_NAMES, FingerName, isQuickDraw, QUICK_DRAW_BONUS, scoreGuess, stumperPoints } from '../services/scoring.js'
import { awardBadges, computeStats, rememberTimezone } from '../services/stats.js'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Verify magic bytes to prevent MIME-type spoofing */
function isAllowedImageBuffer(buf: Buffer): boolean {
  if (buf.length < 12) return false
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return true
  return false
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'))
      return
    }
    cb(null, true)
  },
})

export async function createChallenge(req: AuthRequest, res: Response): Promise<void> {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file
  if (!file) {
    res.status(400).json({ error: 'Photo is required' })
    return
  }

  // Second-layer defence: verify magic bytes even if the MIME filter passed
  if (!isAllowedImageBuffer(file.buffer)) {
    res.status(400).json({ error: 'Only JPEG, PNG, and WebP images are allowed' })
    return
  }

  const { receiverIds, fingerCount, whichFingers } = req.body as {
    receiverIds?: string
    fingerCount?: string
    whichFingers?: string
  }

  if (!receiverIds || !fingerCount || !whichFingers) {
    res.status(400).json({ error: 'receiverIds, fingerCount and whichFingers are required' })
    return
  }

  const count = parseInt(fingerCount, 10)
  if (isNaN(count) || count < 1 || count > 5) {
    res.status(400).json({ error: 'fingerCount must be 1–5' })
    return
  }

  let fingers: FingerName[]
  try {
    fingers = JSON.parse(whichFingers) as FingerName[]
  } catch {
    res.status(400).json({ error: 'whichFingers must be a JSON array' })
    return
  }

  if (fingers.length !== count || !fingers.every((f) => FINGER_NAMES.includes(f))) {
    res.status(400).json({ error: 'whichFingers must contain exactly fingerCount valid finger names' })
    return
  }

  let ids: string[]
  try {
    ids = JSON.parse(receiverIds) as string[]
  } catch {
    res.status(400).json({ error: 'receiverIds must be a JSON array' })
    return
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'receiverIds must be a non-empty array' })
    return
  }
  ids = [...new Set(ids)]

  // Verify friendship for all recipients
  for (const receiverId of ids) {
    const friendship = await prisma.friend.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { initiatorId: req.userId!, receiverId },
          { initiatorId: receiverId, receiverId: req.userId! },
        ],
      },
    })
    if (!friendship) {
      res.status(403).json({ error: `You can only challenge friends` })
      return
    }
  }

  // Upload photo once, share URL across all challenges
  const photoUrl = await uploadPhoto(file.buffer)

  const sender = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, username: true, avatarUrl: true },
  })

  // All recipients of this send share one comment/reaction thread
  const groupId = randomUUID()

  const challenges = await Promise.all(
    ids.map((receiverId) =>
      prisma.challenge.create({
        data: {
          senderId: req.userId!,
          receiverId,
          groupId,
          photoUrl,
          fingerCount: count,
          whichFingers: fingers,
        },
        include: {
          sender: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
    ),
  )

  for (const challenge of challenges) {
    emitToUser(challenge.receiverId, 'new_challenge', {
      challengeId: challenge.id,
      from: sender,
    })
    sendPushToUser(challenge.receiverId, {
      title: `${sender?.username ?? 'Someone'} fingled you!`,
      body: 'Tap to guess which fingers',
      url: `/?tab=inbox&highlight=${challenge.id}`,
    }).catch(() => {/* non-fatal */})
  }

  await rememberTimezone(req.userId!, req.header('x-timezone'))
  const newBadges = await awardBadges(req.userId!)

  res.status(201).json({ challenges, newBadges })
}

const commentUser = { select: { id: true, username: true, avatarUrl: true } }
const reactionUser = { select: { id: true, username: true } }
const challengeGroup = { select: { id: true, groupId: true } }

// Comments and reactions for whole groups, keyed by groupId
async function loadGroupThreads(groupIds: string[]) {
  const [comments, reactions] = await Promise.all([
    prisma.comment.findMany({
      where: { challenge: inGroups(groupIds) },
      include: { user: commentUser, challenge: challengeGroup },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.reaction.findMany({
      where: { challenge: inGroups(groupIds) },
      include: { user: reactionUser, challenge: challengeGroup },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const threads = new Map<string, { comments: Omit<(typeof comments)[number], 'challenge'>[]; reactions: Omit<(typeof reactions)[number], 'challenge'>[] }>()
  const thread = (gid: string) => {
    if (!threads.has(gid)) threads.set(gid, { comments: [], reactions: [] })
    return threads.get(gid)!
  }
  for (const { challenge, ...comment } of comments) thread(groupKey(challenge)).comments.push(comment)
  for (const { challenge, ...reaction } of reactions) thread(groupKey(challenge)).reactions.push(reaction)
  return threads
}

export async function getReceivedChallenges(req: AuthRequest, res: Response): Promise<void> {
  const all = await prisma.challenge.findMany({
    where: { receiverId: req.userId! },
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
      guess: { select: { points: true, quickDraw: true, isCountCorrect: true, isFingersCorrect: true, fingerCountGuess: true, whichFingersGuess: true, createdAt: true } },
    },
  })

  const groupIds = [...new Set(all.map(groupKey))]
  const [threads, siblings] = await Promise.all([
    loadGroupThreads(groupIds),
    prisma.challenge.findMany({
      where: inGroups(groupIds),
      select: {
        id: true,
        groupId: true,
        receiver: { select: { id: true, username: true, avatarUrl: true } },
        guess: { select: { points: true, isCountCorrect: true } },
      },
    }),
  ])

  const siblingsByGroup = new Map<string, typeof siblings>()
  for (const s of siblings) {
    const gid = groupKey(s)
    siblingsByGroup.set(gid, [...(siblingsByGroup.get(gid) ?? []), s])
  }

  const challenges = all.map((c) => {
    const gid = groupKey(c)
    // Hide the thread until this user has guessed, so it can't spoil the answer
    const thread = c.guess ? threads.get(gid) : undefined
    const group = siblingsByGroup.get(gid) ?? []
    const others = group.filter((s) => s.receiver.id !== req.userId)
    return {
      ...c,
      groupId: gid,
      comments: thread?.comments ?? [],
      reactions: thread?.reactions ?? [],
      // Other friends this fingle was also sent to
      coRecipients: others.map((s) => s.receiver),
      // Counts only, so safe to show before guessing
      groupProgress: {
        total: group.length,
        guessed: group.filter((s) => s.guess).length,
        cracked: group.filter((s) => s.guess?.isCountCorrect).length,
      },
      // How everyone else did — only once this player has guessed too
      coResults: c.guess ? others.map((s) => ({ user: s.receiver, points: s.guess?.points ?? null })) : [],
    }
  })

  // Unguessed first (newest first within each group), then guessed
  const newestFirst = (a: { createdAt: Date }, b: { createdAt: Date }) => b.createdAt.getTime() - a.createdAt.getTime()
  const unguessed = challenges.filter((c) => !c.guess).sort(newestFirst)
  const guessed = challenges.filter((c) => c.guess).sort(newestFirst)

  res.json({ challenges: [...unguessed, ...guessed] })
}

export async function getSentChallenges(req: AuthRequest, res: Response): Promise<void> {
  const all = await prisma.challenge.findMany({
    where: { senderId: req.userId! },
    orderBy: { createdAt: 'desc' },
    include: {
      receiver: { select: { id: true, username: true, avatarUrl: true } },
      guess: { select: { points: true, quickDraw: true, senderPoints: true, isCountCorrect: true, isFingersCorrect: true, createdAt: true } },
    },
  })

  const threads = await loadGroupThreads([...new Set(all.map(groupKey))])

  const challenges = all.map((c) => {
    const gid = groupKey(c)
    const thread = threads.get(gid)
    return { ...c, groupId: gid, comments: thread?.comments ?? [], reactions: thread?.reactions ?? [] }
  })

  res.json({ challenges })
}

export async function checkCount(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params
  const { fingerCountGuess } = req.body as { fingerCountGuess?: number }

  if (fingerCountGuess === undefined || fingerCountGuess < 1 || fingerCountGuess > 5) {
    res.status(400).json({ error: 'fingerCountGuess must be 1–5' })
    return
  }

  const challenge = await prisma.challenge.findUnique({ where: { id } })
  if (!challenge || challenge.receiverId !== req.userId) {
    res.status(404).json({ error: 'Challenge not found' })
    return
  }

  const existing = await prisma.guess.findUnique({ where: { challengeId: id } })
  if (existing) {
    res.status(409).json({ error: 'Already guessed this challenge' })
    return
  }

  const isCorrect = fingerCountGuess === challenge.fingerCount
  res.json({ isCorrect, correctCount: isCorrect ? undefined : challenge.fingerCount })
}

export async function submitGuess(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params
  const { fingerCountGuess, whichFingersGuess } = req.body as {
    fingerCountGuess?: number
    whichFingersGuess?: FingerName[]
  }

  if (fingerCountGuess === undefined || fingerCountGuess < 1 || fingerCountGuess > 5) {
    res.status(400).json({ error: 'fingerCountGuess must be 1–5' })
    return
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
  })

  if (!challenge || challenge.receiverId !== req.userId) {
    res.status(404).json({ error: 'Challenge not found' })
    return
  }

  const existing = await prisma.guess.findUnique({ where: { challengeId: id } })
  if (existing) {
    res.status(409).json({ error: 'Already guessed this challenge' })
    return
  }

  const fingersGuess = Array.isArray(whichFingersGuess) ? whichFingersGuess : []

  const { points: basePoints, isCountCorrect, isFingersCorrect } = scoreGuess(
    challenge.fingerCount,
    challenge.whichFingers as FingerName[],
    fingerCountGuess,
    fingersGuess,
  )
  const quickDraw = isQuickDraw(basePoints, challenge.createdAt, new Date())
  const points = basePoints + (quickDraw ? QUICK_DRAW_BONUS : 0)
  const senderPoints = stumperPoints(basePoints)

  await rememberTimezone(req.userId!, req.header('x-timezone'))

  const [guess] = await prisma.$transaction([
    prisma.guess.create({
      data: {
        challengeId: id,
        userId: req.userId!,
        fingerCountGuess,
        whichFingersGuess: fingersGuess,
        isCountCorrect,
        isFingersCorrect,
        points,
        quickDraw,
        senderPoints,
      },
    }),
    prisma.challenge.update({ where: { id }, data: { seen: true } }),
    prisma.user.update({
      where: { id: req.userId! },
      data: { totalScore: { increment: points } },
    }),
    prisma.user.update({
      where: { id: challenge.senderId },
      data: { totalScore: { increment: senderPoints } },
    }),
  ])

  const [stats, senderBadges, guesser] = await Promise.all([
    computeStats(req.userId!),
    awardBadges(challenge.senderId),
    prisma.user.findUnique({ where: { id: req.userId! }, select: { username: true } }),
  ])
  const newBadges = await awardBadges(req.userId!, stats)

  emitToUser(challenge.senderId, 'challenge_guessed', {
    challengeId: id,
    by: { id: req.userId },
    points,
    senderPoints,
    isCountCorrect,
    isFingersCorrect,
    newBadges: senderBadges,
  })

  // The sender hears how their fingle landed — the payoff for making a hard one
  const name = guesser?.username ?? 'Someone'
  sendPushToUser(challenge.senderId, {
    title: basePoints === 30 ? `${name} nailed your fingle` : basePoints === 0 ? `You stumped ${name}!` : `${name} half cracked your fingle`,
    body: senderPoints > 0 ? `+${senderPoints} stumper points for you` : `They scored +${points}`,
    url: `/?tab=sent&highlight=${id}`,
    tag: `fingle-${groupKey(challenge)}`,
  }).catch(() => {/* non-fatal */})

  res.json({
    guess,
    result: {
      points,
      basePoints,
      quickDraw,
      isCountCorrect,
      isFingersCorrect,
      correctCount: challenge.fingerCount,
      correctFingers: challenge.whichFingers,
      photoUrl: challenge.photoUrl,
    },
    progress: {
      xpBefore: stats.xp - points,
      xp: stats.xp,
      level: stats.level,
      levelStart: stats.levelStart,
      nextLevelAt: stats.nextLevelAt,
      hotStreak: stats.hotStreak,
      daily: stats.daily,
      newBadges,
    },
  })
}
