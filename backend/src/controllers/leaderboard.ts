import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export async function getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
  const scope = (req.query.scope as string | undefined) ?? 'global'
  const period = (req.query.period as string | undefined) ?? 'alltime'

  // Resolve friend IDs if scope=friends
  let friendIds: string[] | null = null
  if (scope === 'friends') {
    const friendRows = await prisma.friend.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ initiatorId: req.userId! }, { receiverId: req.userId! }],
      },
    })
    friendIds = friendRows.map((f) =>
      f.initiatorId === req.userId ? f.receiverId : f.initiatorId,
    )
    friendIds.push(req.userId!)
  }

  // All-time: use stored totalScore
  if (period === 'alltime') {
    const users = await prisma.user.findMany({
      where: friendIds ? { id: { in: friendIds } } : undefined,
      select: { id: true, username: true, avatarUrl: true, totalScore: true },
      orderBy: { totalScore: 'desc' },
      take: 50,
    })
    res.json({ leaderboard: users })
    return
  }

  // Weekly / Monthly: aggregate Guess.points within the window
  const now = new Date()
  const startDate =
    period === 'weekly'
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const results = await prisma.guess.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: startDate },
      ...(friendIds ? { userId: { in: friendIds } } : {}),
    },
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take: 50,
  })

  // For friends scope, fetch all friends+self so everyone appears even with 0 pts
  const allUserIds = friendIds ?? results.map((r) => r.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, username: true, avatarUrl: true },
  })

  const scoreMap = new Map(results.map((r) => [r.userId, r._sum.points ?? 0]))
  const leaderboard = users
    .map((u) => ({ id: u.id, username: u.username, avatarUrl: u.avatarUrl, totalScore: scoreMap.get(u.id) ?? 0 }))
    .sort((a, b) => b.totalScore - a.totalScore)

  res.json({ leaderboard })
}
