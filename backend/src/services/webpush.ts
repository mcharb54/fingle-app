import webpush from 'web-push'
import { prisma } from '../lib/prisma.js'

webpush.setVapidDetails(
  `mailto:${process.env.FROM_EMAIL ?? 'admin@fingle.club'}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function sendPushToUser(userId: string, payload: object): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return

  const body = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        // 404/410 means the subscription is expired — clean it up
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } })
        }
      }
    }),
  )
}
