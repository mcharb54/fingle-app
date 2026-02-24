import { FormEvent, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  if (!user) return null

  async function handleResendVerification() {
    setResendLoading(true)
    setResendMsg('')
    try {
      await authApi.resendVerification()
      setResendMsg('Verification email sent!')
    } catch (err) {
      setResendMsg(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setResendLoading(false)
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    setPwLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setPwSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setShowChangePassword(false)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-black">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 safe-top px-4 py-3">
        <h1 className="text-xl font-black text-white">Profile</h1>
      </div>

      <div className="p-6 flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-brand-600 flex items-center justify-center text-4xl font-black text-white mb-4">
          {user.username[0].toUpperCase()}
        </div>
        <h2 className="text-2xl font-black text-white">{user.username}</h2>
        <p className="text-gray-400 text-sm mt-1">{user.email}</p>

        {/* Email verification banner */}
        {!user.emailVerified && (
          <div className="mt-4 w-full bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 text-left">
            <p className="text-amber-400 font-semibold text-sm mb-1">Verify your email</p>
            <p className="text-gray-400 text-xs mb-3">
              Check your inbox for a verification link. Didn't get it?
            </p>
            {resendMsg ? (
              <p className="text-amber-300 text-xs font-semibold">{resendMsg}</p>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="text-amber-400 text-xs font-semibold underline disabled:opacity-50"
              >
                {resendLoading ? 'Sending…' : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        {/* Score */}
        <div className="mt-8 w-full bg-zinc-900 rounded-2xl p-6 text-center">
          <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Total score</p>
          <p className="text-5xl font-black text-brand-400">{user.totalScore}</p>
          <p className="text-gray-500 text-sm mt-1">points</p>
        </div>

        {/* Scoring legend */}
        <div className="mt-4 w-full bg-zinc-900 rounded-2xl p-5 text-left space-y-3">
          <p className="text-white font-bold">How scoring works</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <p className="text-white text-sm font-semibold">Wrong count</p>
              <p className="text-gray-500 text-xs">Photo reveals, 0 pts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-white text-sm font-semibold">Correct count</p>
              <p className="text-gray-500 text-xs">+10 pts, unlock finger guessing</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-white text-sm font-semibold">Correct count + correct fingers</p>
              <p className="text-gray-500 text-xs">+30 pts total</p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="mt-4 w-full bg-zinc-900 rounded-2xl overflow-hidden">
          <button
            onClick={() => {
              setShowChangePassword((v) => !v)
              setPwError('')
              setPwSuccess('')
            }}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-white font-semibold text-sm">Change Password</span>
            <span className="text-gray-500 text-xs">{showChangePassword ? '▲' : '▼'}</span>
          </button>

          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="px-5 pb-5 space-y-3">
              {pwError && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 rounded-xl p-3 text-xs">
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="bg-green-500/20 border border-green-500 text-green-300 rounded-xl p-3 text-xs">
                  {pwSuccess}
                </div>
              )}
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-brand-400"
              />
              <input
                type="password"
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-brand-400"
              />
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-sm"
              >
                {pwLoading ? 'Saving…' : 'Save New Password'}
              </button>
            </form>
          )}
        </div>

        <button
          onClick={logout}
          className="mt-8 w-full border border-red-500/50 text-red-400 hover:bg-red-500/10 font-semibold py-3 rounded-xl transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
