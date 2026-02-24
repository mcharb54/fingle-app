import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from './auth.js'

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }

  const token = header.slice(7)
  let userId: string
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    userId = payload.userId
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.isAdmin) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  req.userId = userId
  next()
}
