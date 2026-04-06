import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { emitToUser } from '../services/socket.js'

const ALLOWED_EMOJIS = ['👍', '👎', '🫶', '👌', '🤙', '🖕', '✌️', '🙌', '🤟', '🤘', '🙏']

export async function toggleReaction(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params
  const { emoji } = req.body as { emoji?: string }

  if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
    res.status(400).json({ error: 'Invalid emoji' })
    return
  }

  const challenge = await prisma.challenge.findUnique({ where: { id } })
  if (!challenge || (challenge.senderId !== req.userId && challenge.receiverId !== req.userId)) {
    res.status(404).json({ error: 'Challenge not found' })
    return
  }

  // Receiver must have guessed before reacting
  if (challenge.receiverId === req.userId) {
    const guess = await prisma.guess.findUnique({ where: { challengeId: id } })
    if (!guess) {
      res.status(403).json({ error: 'You must guess before reacting' })
      return
    }
  }

  const existing = await prisma.reaction.findUnique({
    where: { challengeId_userId_emoji: { challengeId: id, userId: req.userId!, emoji } },
  })

  const reactor = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, username: true },
  })

  const otherId = challenge.senderId === req.userId ? challenge.receiverId : challenge.senderId

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } })
    const payload = {
      challengeId: id,
      emoji,
      action: 'removed' as const,
      reactionId: existing.id,
      byUserId: req.userId,
      byUsername: reactor?.username,
    }
    emitToUser(otherId, 'reaction_updated', payload)
    emitToUser(req.userId!, 'reaction_updated', payload)
    res.json({ action: 'removed', emoji })
  } else {
    const reaction = await prisma.reaction.create({
      data: { challengeId: id, userId: req.userId!, emoji },
      include: { user: { select: { id: true, username: true } } },
    })
    const payload = {
      challengeId: id,
      emoji,
      action: 'added' as const,
      reactionId: reaction.id,
      byUserId: req.userId,
      byUsername: reactor?.username,
    }
    emitToUser(otherId, 'reaction_updated', payload)
    emitToUser(req.userId!, 'reaction_updated', payload)
    res.status(201).json({ action: 'added', reaction })
  }
}
