import { Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { AuthRequest } from '../middleware/auth.js'
import { sendPushToUser } from '../services/webpush.js'

export async function subscribe(req: AuthRequest, res: Response): Promise<void> {
  const { endpoint, keys } = req.body as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: 'Invalid push subscription' })
    return
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: req.userId!, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: req.userId!, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  })

  res.status(201).json({ ok: true })
}

export async function unsubscribe(req: AuthRequest, res: Response): Promise<void> {
  const { endpoint } = req.body as { endpoint?: string }

  if (!endpoint) {
    res.status(400).json({ error: 'endpoint is required' })
    return
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: req.userId! },
  })

  res.json({ ok: true })
}

export async function testPush(req: AuthRequest, res: Response): Promise<void> {
  await sendPushToUser(req.userId!, {
    title: 'Test notification',
    body: 'Push notifications are working!',
    url: '/',
  })
  res.json({ ok: true })
}
