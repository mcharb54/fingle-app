import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api'
import { useAuth } from '../context/AuthContext'
import HandGlyph from '../components/ui/HandGlyph'

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
    <div className="quiet min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <>
            <HandGlyph raised={['thumb', 'index', 'middle', 'ring', 'pinky']} className="w-16 mx-auto text-pen mb-5 animate-wiggle" />
            <p className="text-pen-soft">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <HandGlyph raised={['thumb']} className="w-16 mx-auto text-pen mb-5 -rotate-6" />
            <h2 className="page-title mb-3">Email verified!</h2>
            <p className="text-pen-soft mb-8">You're all set. Your account is fully confirmed.</p>
            <Link
              to="/"
              className="btn-pen w-full"
            >
              Go to Fingle
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <HandGlyph raised={[]} className="w-16 mx-auto text-redpen mb-5 rotate-6" />
            <h2 className="page-title mb-3">Verification failed</h2>
            <p className="text-pen-soft mb-8">{message}</p>
            <Link
              to="/"
              className="btn-pen w-full"
            >
              Back to Fingle
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
