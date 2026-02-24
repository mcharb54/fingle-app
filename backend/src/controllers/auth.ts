import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js'

function signToken(userId: string): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '30d' })
}

function sanitizeUser(user: {
  id: string
  username: string
  email: string
  avatarUrl: string | null
  totalScore: number
  emailVerified: boolean
  createdAt: Date
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    totalScore: user.totalScore,
    emailVerified: user.emailVerified,
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

  // Send verification email (non-blocking — don't fail registration if it errors)
  try {
    const token = crypto.randomBytes(32).toString('hex')
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })
    await sendVerificationEmail(email, token)
  } catch (err) {
    console.error('Failed to send verification email:', err)
  }

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

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { token } = req.query as { token?: string }

  if (!token) {
    res.status(400).json({ error: 'Token is required' })
    return
  }

  try {
    const record = await prisma.emailVerificationToken.findUnique({ where: { token } })
    if (!record) {
      res.status(400).json({ error: 'Invalid or expired verification link' })
      return
    }
    if (record.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } })
      res.status(400).json({ error: 'Verification link has expired' })
      return
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    })
    await prisma.emailVerificationToken.delete({ where: { id: record.id } })

    res.json({ message: 'Email verified successfully' })
  } catch (err) {
    console.error('verifyEmail error:', err)
    res.status(500).json({ error: 'Failed to verify email' })
  }
}

export async function resendVerification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    if (user.emailVerified) {
      res.status(400).json({ error: 'Email is already verified' })
      return
    }

    // Delete existing tokens and create a fresh one
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })
    const token = crypto.randomBytes(32).toString('hex')
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })
    await sendVerificationEmail(user.email, token)

    res.json({ message: 'Verification email sent' })
  } catch (err) {
    console.error('resendVerification error:', err)
    res.status(500).json({ error: 'Failed to send verification email' })
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email?: string }

  if (!email) {
    res.status(400).json({ error: 'Email is required' })
    return
  }

  try {
    // Always return 200 to avoid user enumeration
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
      const token = crypto.randomBytes(32).toString('hex')
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      })
      try {
        await sendPasswordResetEmail(email, token)
      } catch (err) {
        console.error('Failed to send password reset email:', err)
      }
    }

    res.json({ message: 'If that email exists, you will receive a reset link shortly' })
  } catch (err) {
    console.error('forgotPassword error:', err)
    res.json({ message: 'If that email exists, you will receive a reset link shortly' })
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token?: string; password?: string }

  if (!token || !password) {
    res.status(400).json({ error: 'Token and password are required' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' })
    return
  }

  try {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } })
    if (!record) {
      res.status(400).json({ error: 'Invalid or expired reset link' })
      return
    }
    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } })
      res.status(400).json({ error: 'Reset link has expired' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    })
    await prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } })

    res.json({ message: 'Password reset successfully' })
  } catch (err) {
    console.error('resetPassword error:', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string }

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' })
    return
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters' })
    return
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      res.status(401).json({ error: 'Current password is incorrect' })
      return
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    console.error('changePassword error:', err)
    res.status(500).json({ error: 'Failed to change password' })
  }
}
