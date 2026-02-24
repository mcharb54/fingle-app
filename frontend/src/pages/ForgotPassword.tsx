import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-6">📧</div>
          <h2 className="text-2xl font-black text-white mb-3">Check your inbox</h2>
          <p className="text-gray-400 text-sm mb-8">
            If an account with that email exists, we've sent a password reset link. Check your spam folder if you don't see it.
          </p>
          <Link
            to="/login"
            className="block w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-5xl font-black text-center mb-2 text-brand-400">Fingle</h1>
        <p className="text-gray-400 text-center mb-10 text-sm">Reset your password</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          <input
            type="email"
            placeholder="Your account email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
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
