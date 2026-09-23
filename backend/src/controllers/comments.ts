import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { emitToGroup, groupKey, loadGroup, participantAccess, pushToGroup } from '../services/fingleGroup.js'

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

  const group = await loadGroup(id)
  if (!group) {
    res.status(404).json({ error: 'Challenge not found' })
    return
  }

  const access = participantAccess(group, req.userId!, 'commenting')
  if (!access.ok) {
    res.status(access.status).json({ error: access.error })
    return
  }

  const comment = await prisma.comment.create({
    data: { challengeId: access.challengeId, userId: req.userId!, text: text.trim() },
    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
  })

  emitToGroup(group, 'comment_updated', { challengeId: id, action: 'added', comment })

  const preview = comment.text.length > 80 ? comment.text.slice(0, 80) + '…' : comment.text
  pushToGroup(group, req.userId!, {
    title: `${comment.user.username} commented`,
    body: preview,
  })

  res.status(201).json({ comment })
}

export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
  const { id, commentId } = req.params

  const [comment, group] = await Promise.all([
    prisma.comment.findUnique({
      where: { id: commentId },
      include: { challenge: { select: { id: true, groupId: true } } },
    }),
    loadGroup(id),
  ])

  // The comment may live on any challenge row in the group, not just the one in the URL
  if (!comment || !group || groupKey(comment.challenge) !== group.groupId) {
    res.status(404).json({ error: 'Comment not found' })
    return
  }

  if (comment.userId !== req.userId) {
    res.status(403).json({ error: 'Not authorized' })
    return
  }

  await prisma.comment.delete({ where: { id: commentId } })

  emitToGroup(group, 'comment_updated', { challengeId: id, action: 'deleted', commentId })

  res.json({ message: 'Comment deleted' })
}
