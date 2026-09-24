const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

let warnedUnset = false

/**
 * Checks a Cloudflare Turnstile token from the sign-up form. Fails closed: a
 * missing, invalid or unverifiable token is a rejection. Until TURNSTILE_SECRET_KEY
 * is configured, sign-up stays open so deploys can roll out in either order.
 */
export async function verifyTurnstile(token: unknown, remoteIp?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (!warnedUnset) {
      console.warn('[turnstile] TURNSTILE_SECRET_KEY is not set — sign-up is not bot-protected')
      warnedUnset = true
    }
    return true
  }

  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false

  try {
    const body = new URLSearchParams({ secret, response: token })
    if (remoteIp) body.set('remoteip', remoteIp)
    const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(5000) })
    const data = (await res.json()) as { success?: boolean; action?: string; 'error-codes'?: string[] }
    if (!data.success) {
      console.warn('[turnstile] rejected sign-up:', data['error-codes']?.join(', '))
      return false
    }
    // A token minted for another form on the site shouldn't unlock sign-up
    return !data.action || data.action === 'register'
  } catch (err) {
    console.error('[turnstile] could not reach Cloudflare:', err)
    return false
  }
}
