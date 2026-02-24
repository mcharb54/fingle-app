import { Response } from 'express'
import multer from 'multer'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { uploadPhoto } from '../services/cloudinary.js'
import { emitToUser } from '../services/socket.js'

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

const FINGER_NAMES = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const
type FingerName = (typeof FINGER_NAMES)[number]

function scoreGuess(
  correctCount: number,
  correctFingers: FingerName[],
  countGuess: number,
  fingersGuess: FingerName[],
): { points: number; isCountCorrect: boolean; isFingersCorrect: boolean } {
  const isCountCorrect = countGuess === correctCount
  if (!isCountCorrect) return { points: 0, isCountCorrect: false, isFingersCorrect: false }

  const correctSet = new Set(correctFingers)
  const guessSet = new Set(fingersGuess)
  const isFingersCorrect =
    correctSet.size === guessSet.size &&
    [...correctSet].every((f) => guessSet.has(f))

  return {
    points: isCountCorrect ? (isFingersCorrect ? 30 : 10) : 0,
    isCountCorrect,
    isFingersCorrect,
  }
}

export async function createChallenge(req: AuthRequest, res: Response): Promise<void> {
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file
  if (!file) {
    res.status(400).json({ error: 'Photo is required' })
    return
  }

  const { receiverId, fingerCount, whichFingers } = req.body as {
    receiverId?: string
    fingerCount?: string
    whichFingers?: string
  }

  if (!receiverId || !fingerCount || !whichFingers) {
    res.status(400).json({ error: 'receiverId, fingerCount and whichFingers are required' })
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

  // Verify friendship
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
    res.status(403).json({ error: 'You can only challenge friends' })
    return
  }

  const photoUrl = await uploadPhoto(file.buffer)

  const challenge = await prisma.challenge.create({
    data: {
      senderId: req.userId!,
      receiverId,
      photoUrl,
      fingerCount: count,
      whichFingers: fingers,
    },
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
    },
  })

  emitToUser(receiverId, 'new_challenge', {
    challengeId: challenge.id,
    from: challenge.sender,
  })

  res.status(201).json({ challenge })
}

export async function getReceivedChallenges(req: AuthRequest, res: Response): Promise<void> {
  const challenges = await prisma.challenge.findMany({
    where: { receiverId: req.userId! },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
      guess: { select: { points: true, isCountCorrect: true, isFingersCorrect: true, fingerCountGuess: true, whichFingersGuess: true, createdAt: true } },
    },
  })
  res.json({ challenges })
}

export async function getSentChallenges(req: AuthRequest, res: Response): Promise<void> {
  const challenges = await prisma.challenge.findMany({
    where: { senderId: req.userId! },
    orderBy: { createdAt: 'desc' },
    include: {
      receiver: { select: { id: true, username: true, avatarUrl: true } },
      guess: { select: { points: true, isCountCorrect: true, isFingersCorrect: true, createdAt: true } },
    },
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

  res.json({ isCorrect: fingerCountGuess === challenge.fingerCount })
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

  const { points, isCountCorrect, isFingersCorrect } = scoreGuess(
    challenge.fingerCount,
    challenge.whichFingers as FingerName[],
    fingerCountGuess,
    fingersGuess,
  )

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
      },
    }),
    prisma.challenge.update({ where: { id }, data: { seen: true } }),
    prisma.user.update({
      where: { id: req.userId! },
      data: { totalScore: { increment: points } },
    }),
  ])

  emitToUser(challenge.senderId, 'challenge_guessed', {
    challengeId: id,
    by: { id: req.userId },
    points,
    isCountCorrect,
    isFingersCorrect,
  })

  res.json({
    guess,
    result: {
      points,
      isCountCorrect,
      isFingersCorrect,
      correctCount: challenge.fingerCount,
      correctFingers: challenge.whichFingers,
      photoUrl: challenge.photoUrl,
    },
  })
}
