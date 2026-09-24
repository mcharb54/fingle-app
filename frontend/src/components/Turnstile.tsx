import { useEffect, useRef, useState } from 'react'

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string
  reset(widgetId?: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/** Off when no site key is configured, so the form still works without it. */
export const turnstileEnabled = Boolean(SITE_KEY)

let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_URL
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null
      reject(new Error('Turnstile failed to load'))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

interface Props {
  action: string
  onToken: (token: string | null) => void
  /** Change this to get a fresh token — each token only works once */
  resetSignal?: number
}

/**
 * Cloudflare Turnstile, invisible unless Cloudflare wants the person to
 * interact. Reports a token (or null when it expires or fails).
 */
export default function Turnstile({ action, onToken, resetSignal = 0 }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking')

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !el.current || !window.turnstile) return
        widgetId.current = window.turnstile.render(el.current, {
          sitekey: SITE_KEY,
          action,
          appearance: 'interaction-only',
          theme: 'light',
          callback: (token: string) => {
            setStatus('ok')
            onTokenRef.current(token)
          },
          'expired-callback': () => {
            setStatus('checking')
            onTokenRef.current(null)
          },
          'error-callback': () => {
            setStatus('error')
            onTokenRef.current(null)
          },
        })
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [action])

  useEffect(() => {
    if (resetSignal === 0 || !widgetId.current || !window.turnstile) return
    setStatus('checking')
    onTokenRef.current(null)
    window.turnstile.reset(widgetId.current)
  }, [resetSignal])

  if (!SITE_KEY) return null
  return (
    <div className="flex flex-col items-center gap-1">
      <div ref={el} />
      {status === 'checking' && <p className="text-sm text-pen-soft">Checking you're a person…</p>}
      {status === 'error' && (
        <p className="text-sm text-redpen">
          The human check didn't load. Turn off content blockers for this page, then refresh.
        </p>
      )}
    </div>
  )
}
