import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  if (!user) return null

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
