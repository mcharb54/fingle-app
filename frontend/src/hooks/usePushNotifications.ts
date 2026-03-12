import { useCallback, useEffect, useState } from 'react'
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

function checkPushSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function usePushNotifications() {
  const { user } = useAuth()
  const [isSupported, setIsSupported] = useState(() => checkPushSupport())
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unknown',
  )
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Re-check support on mount (iOS APIs may not be available at module load time)
  useEffect(() => {
    setIsSupported(checkPushSupport())
  }, [])

  // On mount: register SW and sync existing subscription (no permission prompt)
  useEffect(() => {
    if (!user || !VAPID_PUBLIC_KEY || !isSupported) return

    async function syncSubscription() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          await pushApi.subscribe(existing.toJSON() as PushSubscriptionJSON)
          setIsSubscribed(true)
          return
        }

        // If permission was already granted but subscription is missing, auto-subscribe
        if (Notification.permission === 'granted') {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
          })
          await pushApi.subscribe(subscription.toJSON() as PushSubscriptionJSON)
          setIsSubscribed(true)
        }

        setPermission(Notification.permission)
      } catch (err) {
        console.error('[push] sync failed:', err)
      }
    }

    syncSubscription()
  }, [user])

  // Must be called from a user gesture (click/tap) for iOS compatibility
  const enableNotifications = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY || !isSupported) return

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
      }

      await pushApi.subscribe(subscription.toJSON() as PushSubscriptionJSON)
      setIsSubscribed(true)
    } catch (err) {
      console.error('[push] enable failed:', err)
    }
  }, [])

  return { isSupported, permission, isSubscribed, enableNotifications }
}
