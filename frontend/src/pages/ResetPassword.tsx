import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api'
import Logo from '../components/ui/Logo'
import HandGlyph from '../components/ui/HandGlyph'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="quiet min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <HandGlyph raised={[]} className="w-16 mx-auto text-redpen mb-5 rotate-6" />
          <h2 className="page-title mb-3">Invalid link</h2>
          <p className="text-pen-soft mb-8">This reset link is missing a token. Please request a new one.</p>
          <Link
            to="/forgot-password"
            className="btn-pen w-full"
          >
            Request New Link
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="quiet min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <HandGlyph raised={['thumb']} className="w-16 mx-auto text-pen mb-5 -rotate-6" />
          <h2 className="page-title mb-3">Password reset!</h2>
          <p className="text-pen-soft mb-8">Your password has been updated. You can now sign in with your new password.</p>
          <Link
            to="/login"
            className="btn-pen w-full"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="quiet min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Logo subtitle="Set a new password" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="note-error">
              {error}
            </div>
          )}
          <input
            type="password"
            placeholder="New password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="field"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className="field"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-pen w-full"
          >
            {loading ? 'Saving…' : 'Set New Password'}
          </button>
        </form>

        <p className="text-center text-pen-soft text-sm mt-6">
          <Link to="/login" className="link font-bold">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
