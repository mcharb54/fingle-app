import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { emitToUser } from '../services/socket.js'

export async function searchUsers(req: AuthRequest, res: Response): Promise<void> {
  const q = (req.query.q as string | undefined)?.trim()
  if (!q || q.length < 2) {
    res.status(400).json({ error: 'Query must be at least 2 characters' })
    return
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { username: { contains: q, mode: 'insensitive' } },
        { id: { not: req.userId! } },
      ],
    },
    select: { id: true, username: true, avatarUrl: true, totalScore: true },
    take: 20,
  })

  res.json({ users })
}

export async function sendRequest(req: AuthRequest, res: Response): Promise<void> {
  const { receiverId } = req.body as { receiverId?: string }
  if (!receiverId) {
    res.status(400).json({ error: 'receiverId is required' })
    return
  }
  if (receiverId === req.userId) {
    res.status(400).json({ error: 'Cannot send friend request to yourself' })
    return
  }

  const existing = await prisma.friend.findFirst({
    where: {
      OR: [
        { initiatorId: req.userId!, receiverId },
        { initiatorId: receiverId, receiverId: req.userId! },
      ],
    },
  })
  if (existing) {
    res.status(409).json({ error: 'Friend relationship already exists' })
    return
  }

  const friend = await prisma.friend.create({
    data: { initiatorId: req.userId!, receiverId },
    include: { initiator: { select: { id: true, username: true, avatarUrl: true } } },
  })

  emitToUser(receiverId, 'friend_request', {
    friendId: friend.id,
    from: friend.initiator,
  })

  res.status(201).json({ friend })
}

export async function acceptRequest(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params

  const friend = await prisma.friend.findUnique({ where: { id } })
  if (!friend || friend.receiverId !== req.userId) {
    res.status(404).json({ error: 'Friend request not found' })
    return
  }

  const updated = await prisma.friend.update({
    where: { id },
    data: { status: 'ACCEPTED' },
    include: {
      receiver: { select: { id: true, username: true, avatarUrl: true } },
    },
  })

  emitToUser(friend.initiatorId, 'friend_accepted', {
    friendId: id,
    by: updated.receiver,
  })

  res.json({ friend: updated })
}

export async function getFriends(req: AuthRequest, res: Response): Promise<void> {
  const rows = await prisma.friend.findMany({
    where: {
      OR: [
        { initiatorId: req.userId!, status: 'ACCEPTED' },
        { receiverId: req.userId!, status: 'ACCEPTED' },
      ],
    },
    include: {
      initiator: { select: { id: true, username: true, avatarUrl: true, totalScore: true } },
      receiver: { select: { id: true, username: true, avatarUrl: true, totalScore: true } },
    },
  })

  const friends = rows.map((r) => ({
    friendshipId: r.id,
    user: r.initiatorId === req.userId ? r.receiver : r.initiator,
  }))

  res.json({ friends })
}

export async function getPendingRequests(req: AuthRequest, res: Response): Promise<void> {
  const rows = await prisma.friend.findMany({
    where: { receiverId: req.userId!, status: 'PENDING' },
    include: {
      initiator: { select: { id: true, username: true, avatarUrl: true } },
    },
  })
  res.json({ requests: rows.map((r) => ({ friendId: r.id, from: r.initiator })) })
}
