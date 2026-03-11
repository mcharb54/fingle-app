import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { pushApi } from '../api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}

export function usePushNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user || !VAPID_PUBLIC_KEY) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    async function setup() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')

        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          // Ensure the backend has this subscription (e.g. after re-login)
          await pushApi.subscribe(existing.toJSON() as PushSubscriptionJSON)
          return
        }

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
        })

        await pushApi.subscribe(subscription.toJSON() as PushSubscriptionJSON)
      } catch (err) {
        console.error('[push] setup failed:', err)
      }
    }

    setup()
  }, [user])
}
