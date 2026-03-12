import { useEffect } from 'react'

const STALE_THRESHOLD_MS = 30_000 // 30 seconds

/**
 * Reloads the page when the app returns to the foreground after being
 * backgrounded for longer than STALE_THRESHOLD_MS. This ensures fresh data,
 * live socket connections, and up-to-date auth state in the iOS home-screen PWA.
 */
export function useReloadOnResume() {
  useEffect(() => {
    let hiddenAt: number | null = null

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
      } else if (document.visibilityState === 'visible' && hiddenAt) {
        if (Date.now() - hiddenAt > STALE_THRESHOLD_MS) {
          window.location.reload()
        }
        hiddenAt = null
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])
}
