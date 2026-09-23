import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api'
import Logo from '../components/ui/Logo'
import HandGlyph from '../components/ui/HandGlyph'

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
      <div className="quiet min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <HandGlyph raised={['index']} className="w-16 mx-auto text-pen mb-5 -rotate-12" />
          <h2 className="page-title mb-3">Check your inbox</h2>
          <p className="text-pen-soft mb-8">
            If an account with that email exists, we've sent a password reset link. Check your spam folder if you don't see it.
          </p>
          <Link
            to="/login"
            className="btn-pen w-full"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="quiet min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Logo subtitle="Reset your password" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="note-error">
              {error}
            </div>
          )}
          <input
            type="email"
            placeholder="Your account email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-pen w-full"
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
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
