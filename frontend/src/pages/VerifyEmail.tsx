import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api'
import { useAuth } from '../context/AuthContext'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { refreshUser } = useAuth()

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token found in the link.')
      return
    }

    authApi
      .verifyEmail(token)
      .then(({ message }) => {
        setStatus('success')
        setMessage(message)
        refreshUser()
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Verification failed')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <>
            <div className="text-6xl mb-6">⏳</div>
            <p className="text-gray-400">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-2xl font-black text-white mb-3">Email verified!</h2>
            <p className="text-gray-400 text-sm mb-8">You're all set. Your account is fully confirmed.</p>
            <Link
              to="/"
              className="block w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Go to Fingle
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-6xl mb-6">❌</div>
            <h2 className="text-2xl font-black text-white mb-3">Verification failed</h2>
            <p className="text-gray-400 text-sm mb-8">{message}</p>
            <Link
              to="/"
              className="block w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Back to Fingle
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
