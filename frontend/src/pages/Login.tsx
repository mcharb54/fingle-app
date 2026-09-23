import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/ui/Logo'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await authApi.login(email, password)
      login(token, user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="quiet min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Logo subtitle="Snap your fingers. Stump your friends." />

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="note-error">
              {error}
            </div>
          )}
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="field"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-pen w-full"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center mt-4">
          <Link to="/forgot-password" className="link text-sm text-pen-soft">
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-pen-soft text-sm mt-4">
          No account?{' '}
          <Link to="/register" className="link font-bold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
