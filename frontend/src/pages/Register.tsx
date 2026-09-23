import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/ui/Logo'
import HandGlyph from '../components/ui/HandGlyph'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await authApi.register(username, email, password)
      login(token, user)
      setRegisteredEmail(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (registeredEmail) {
    return (
      <div className="quiet min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <HandGlyph raised={['index']} className="w-16 mx-auto text-pen mb-5 -rotate-12" />
          <h2 className="page-title mb-3">Check your inbox</h2>
          <p className="text-pen-soft mb-2">
            We sent a verification link to
          </p>
          <p className="font-bold mb-6">{registeredEmail}</p>
          <p className="text-pen-soft text-sm mb-8">
            You can start playing right away — just verify your email when you get a chance.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-pen w-full"
          >
            Start Playing
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiet min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Logo subtitle="Create your account" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="note-error">
              {error}
            </div>
          )}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={2}
            maxLength={20}
            pattern="[A-Za-z0-9._\-]{2,20}"
            title="2–20 letters, numbers, dots, dashes or underscores"
            className="field"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field"
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="field"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-pen w-full"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-pen-soft text-sm mt-6">
          Have an account?{' '}
          <Link to="/login" className="link font-bold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
