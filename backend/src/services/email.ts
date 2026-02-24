import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function appUrl(): string {
  return process.env.APP_URL ?? 'http://localhost:5173'
}

function fromEmail(): string {
  return process.env.FROM_EMAIL ?? 'Fingle <noreply@fingle.club>'
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl()}/verify-email?token=${token}`

  if (!resend) {
    console.log(`[email] Verification link for ${to}: ${link}`)
    return
  }

  const result = await resend.emails.send({
    from: fromEmail(),
    to,
    subject: 'Verify your Fingle email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fff;border-radius:16px">
        <h1 style="color:#d946ef;font-size:2rem;margin:0 0 8px">Fingle</h1>
        <p style="color:#a1a1aa;margin:0 0 24px">Guess the fingers. Win the game.</p>
        <h2 style="font-size:1.25rem;margin:0 0 12px">Verify your email</h2>
        <p style="color:#a1a1aa;margin:0 0 24px">Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${link}" style="display:inline-block;background:#d946ef;color:#fff;font-weight:700;padding:12px 24px;border-radius:12px;text-decoration:none">Verify Email</a>
        <p style="color:#52525b;font-size:0.75rem;margin:24px 0 0">If you didn't create a Fingle account, you can ignore this email.</p>
      </div>
    `,
  })
  if (result.error) throw new Error(`Resend error: ${JSON.stringify(result.error)}`)
  console.log(`[email] Verification email sent to ${to}, id=${result.data?.id}`)
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${appUrl()}/reset-password?token=${token}`

  if (!resend) {
    console.log(`[email] Password reset link for ${to}: ${link}`)
    return
  }

  const result = await resend.emails.send({
    from: fromEmail(),
    to,
    subject: 'Reset your Fingle password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#09090b;color:#fff;border-radius:16px">
        <h1 style="color:#d946ef;font-size:2rem;margin:0 0 8px">Fingle</h1>
        <p style="color:#a1a1aa;margin:0 0 24px">Guess the fingers. Win the game.</p>
        <h2 style="font-size:1.25rem;margin:0 0 12px">Reset your password</h2>
        <p style="color:#a1a1aa;margin:0 0 24px">Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;background:#d946ef;color:#fff;font-weight:700;padding:12px 24px;border-radius:12px;text-decoration:none">Reset Password</a>
        <p style="color:#52525b;font-size:0.75rem;margin:24px 0 0">If you didn't request a password reset, you can ignore this email.</p>
      </div>
    `,
  })
  if (result.error) throw new Error(`Resend error: ${JSON.stringify(result.error)}`)
  console.log(`[email] Password reset email sent to ${to}, id=${result.data?.id}`)
}
