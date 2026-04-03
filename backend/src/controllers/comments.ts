import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'

export async function addComment(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params
  const { text } = req.body as { text?: string }

  if (!text || text.trim().length === 0) {
    res.status(400).json({ error: 'Comment text is required' })
    return
  }

  if (text.length > 500) {
    res.status(400).json({ error: 'Comment must be 500 characters or less' })
    return
  }

  const challenge = await prisma.challenge.findUnique({ where: { id } })
  if (!challenge || (challenge.senderId !== req.userId && challenge.receiverId !== req.userId)) {
    res.status(404).json({ error: 'Challenge not found' })
    return
  }

  // Receiver must have guessed before commenting
  if (challenge.receiverId === req.userId) {
    const guess = await prisma.guess.findUnique({ where: { challengeId: id } })
    if (!guess) {
      res.status(403).json({ error: 'You must guess before commenting' })
      return
    }
  }

  const comment = await prisma.comment.create({
    data: { challengeId: id, userId: req.userId!, text: text.trim() },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  })

  res.status(201).json({ comment })
}

export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
  const { id, commentId } = req.params

  const comment = await prisma.comment.findUnique({ where: { id: commentId } })

  if (!comment || comment.challengeId !== id) {
    res.status(404).json({ error: 'Comment not found' })
    return
  }

  if (comment.userId !== req.userId) {
    res.status(403).json({ error: 'Not authorized' })
    return
  }

  await prisma.comment.delete({ where: { id: commentId } })
  res.json({ message: 'Comment deleted' })
}
