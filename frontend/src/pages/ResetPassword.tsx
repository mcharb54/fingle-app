import { FormEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api'

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
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-black text-white mb-3">Invalid link</h2>
          <p className="text-gray-400 text-sm mb-8">This reset link is missing a token. Please request a new one.</p>
          <Link
            to="/forgot-password"
            className="block w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Request New Link
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-2xl font-black text-white mb-3">Password reset!</h2>
          <p className="text-gray-400 text-sm mb-8">Your password has been updated. You can now sign in with your new password.</p>
          <Link
            to="/login"
            className="block w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-5xl font-black text-center mb-2 text-brand-400">Fingle</h1>
        <p className="text-gray-400 text-center mb-10 text-sm">Set a new password</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-xl p-3 text-sm">
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
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-400"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Saving…' : 'Set New Password'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          <Link to="/login" className="text-brand-400 font-semibold">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
