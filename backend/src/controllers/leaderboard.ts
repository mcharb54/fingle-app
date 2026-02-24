import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export async function getLeaderboard(req: AuthRequest, res: Response): Promise<void> {
  const scope = (req.query.scope as string | undefined) ?? 'global'

  if (scope === 'friends') {
    const friendRows = await prisma.friend.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ initiatorId: req.userId! }, { receiverId: req.userId! }],
      },
    })
    const friendIds = friendRows.map((f) =>
      f.initiatorId === req.userId ? f.receiverId : f.initiatorId,
    )
    friendIds.push(req.userId!)

    const users = await prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: { id: true, username: true, avatarUrl: true, totalScore: true },
      orderBy: { totalScore: 'desc' },
      take: 50,
    })
    res.json({ leaderboard: users })
    return
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, avatarUrl: true, totalScore: true },
    orderBy: { totalScore: 'desc' },
    take: 50,
  })
  res.json({ leaderboard: users })
}
