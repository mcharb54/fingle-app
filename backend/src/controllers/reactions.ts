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

  const notify = (action: 'added' | 'removed') => {
    const payload = { challengeId: id, emoji, action, byUserId: req.userId }
    const otherId = challenge.senderId === req.userId ? challenge.receiverId : challenge.senderId
    emitToUser(otherId, 'reaction_updated', payload)
    emitToUser(req.userId!, 'reaction_updated', payload)
  }

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } })
    notify('removed')
    res.json({ action: 'removed', emoji })
  } else {
    const reaction = await prisma.reaction.create({
      data: { challengeId: id, userId: req.userId!, emoji },
      include: { user: { select: { id: true, username: true } } },
    })
    notify('added')
    res.status(201).json({ action: 'added', reaction })
  }
}
