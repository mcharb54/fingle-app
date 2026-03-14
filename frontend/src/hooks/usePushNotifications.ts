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

function checkIsIOSSafariBrowser(): boolean {
  if (typeof window === 'undefined') return false
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIOS) return false
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  return !isStandalone
}

export function usePushNotifications() {
  const { user } = useAuth()
  const [isSupported, setIsSupported] = useState(() => checkPushSupport())
  const [isIOSSafariBrowser, setIsIOSSafariBrowser] = useState(() => checkIsIOSSafariBrowser())
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unknown',
  )
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Re-check support on mount (iOS APIs may not be available at module load time)
  useEffect(() => {
    setIsSupported(checkPushSupport())
    setIsIOSSafariBrowser(checkIsIOSSafariBrowser())
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
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.warn('[push] subscription not ready yet (iOS first launch), will retry on next mount')
        } else {
          console.error('[push] sync failed:', err)
        }
      }
    }

    syncSubscription()
  }, [user, isSupported])

  // Must be called from a user gesture (click/tap) for iOS compatibility
  const enableNotifications = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY || !isSupported) return

    try {
      // iOS requires the SW to be active BEFORE Notification.requestPermission() is called.
      // Registering an already-registered SW is a no-op.
      await navigator.serviceWorker.register('/sw.js')
      const registration = await navigator.serviceWorker.ready

      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return

      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          })
        } catch (err) {
          // iOS 16.4 bug: first subscribe attempt can throw AbortError — retry once
          if (err instanceof DOMException && err.name === 'AbortError') {
            await new Promise((resolve) => setTimeout(resolve, 500))
            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            })
          } else {
            throw err
          }
        }
      }

      await pushApi.subscribe(subscription.toJSON() as PushSubscriptionJSON)
      setIsSubscribed(true)
    } catch (err) {
      console.error('[push] enable failed:', err)
    }
  }, [isSupported])

  return { isSupported, isIOSSafariBrowser, permission, isSubscribed, enableNotifications }
}
