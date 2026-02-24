import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export async function getUsers(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        totalScore: true,
        emailVerified: true,
        isAdmin: true,
        isBanned: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ users })
  } catch (err) {
    console.error('admin getUsers error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params

  if (id === req.userId) {
    res.status(400).json({ error: 'Cannot delete your own account' })
    return
  }

  try {
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    if (target.isAdmin) {
      res.status(400).json({ error: 'Cannot delete another admin account' })
      return
    }

    await prisma.user.delete({ where: { id } })
    res.json({ message: 'User deleted' })
  } catch (err) {
    console.error('admin deleteUser error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
}

export async function toggleBan(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params

  if (id === req.userId) {
    res.status(400).json({ error: 'Cannot ban your own account' })
    return
  }

  try {
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    if (target.isAdmin) {
      res.status(400).json({ error: 'Cannot ban another admin account' })
      return
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: !target.isBanned },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        totalScore: true,
        emailVerified: true,
        isAdmin: true,
        isBanned: true,
        createdAt: true,
      },
    })
    res.json({ user: updated })
  } catch (err) {
    console.error('admin toggleBan error:', err)
    res.status(500).json({ error: 'Failed to update user' })
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params
  const { username, email, totalScore } = req.body as {
    username?: string
    email?: string
    totalScore?: number
  }

  try {
    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Check uniqueness for username/email if changing
    if (username && username !== target.username) {
      const conflict = await prisma.user.findUnique({ where: { username } })
      if (conflict) {
        res.status(409).json({ error: 'Username already taken' })
        return
      }
    }
    if (email && email !== target.email) {
      const conflict = await prisma.user.findUnique({ where: { email } })
      if (conflict) {
        res.status(409).json({ error: 'Email already taken' })
        return
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(username !== undefined && { username }),
        ...(email !== undefined && { email }),
        ...(totalScore !== undefined && { totalScore: Number(totalScore) }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        totalScore: true,
        emailVerified: true,
        isAdmin: true,
        isBanned: true,
        createdAt: true,
      },
    })
    res.json({ user: updated })
  } catch (err) {
    console.error('admin updateUser error:', err)
    res.status(500).json({ error: 'Failed to update user' })
  }
}
