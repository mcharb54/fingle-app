import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30d' })
}

function sanitizeUser(user: { id: string; username: string; email: string; avatarUrl: string | null; totalScore: number; createdAt: Date }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    totalScore: user.totalScore,
    createdAt: user.createdAt,
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  const { username, email, password } = req.body as { username?: string; email?: string; password?: string }

  if (!username || !email || !password) {
    res.status(400).json({ error: 'username, email and password are required' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' })
    return
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  })
  if (existing) {
    res.status(409).json({ error: 'Username or email already taken' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { username, email, passwordHash },
  })

  res.status(201).json({ token: signToken(user.id), user: sanitizeUser(user) })
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  res.json({ token: signToken(user.id), user: sanitizeUser(user) })
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json({ user: sanitizeUser(user) })
}
