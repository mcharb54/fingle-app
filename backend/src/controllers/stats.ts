import { Response } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { awardBadges, badgeList, computeStats, headToHead, rememberTimezone } from '../services/stats.js'

export async function getMyStats(req: AuthRequest, res: Response): Promise<void> {
  await rememberTimezone(req.userId!, req.header('x-timezone'))
  const stats = await computeStats(req.userId!)
  // Also catches up badges earned by games played before badges existed
  const newBadges = await awardBadges(req.userId!, stats)
  const [badges, rivals] = await Promise.all([badgeList(req.userId!), headToHead(req.userId!)])
  res.json({ stats, badges, newBadges, headToHead: rivals })
}
