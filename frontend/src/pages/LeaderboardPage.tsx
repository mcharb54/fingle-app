import { useEffect, useState } from 'react'
import { leaderboardApi } from '../api'
import type { PublicUser } from '../types'
import { useAuth } from '../context/AuthContext'

const MEDALS = ['🥇', '🥈', '🥉']

type Period = 'weekly' | 'monthly' | 'alltime'
const PERIODS: { value: Period; label: string }[] = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'alltime', label: 'All Time' },
]

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [scope, setScope] = useState<'global' | 'friends'>('global')
  const [period, setPeriod] = useState<Period>('alltime')
  const [leaderboard, setLeaderboard] = useState<PublicUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    leaderboardApi
      .get(scope, period)
      .then(({ leaderboard }) => setLeaderboard(leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [scope, period])

  return (
    <div className="min-h-full bg-black">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 safe-top">
        <div className="px-4 py-3">
          <h1 className="text-xl font-black text-white">Leaderboard</h1>
        </div>

        {/* Scope tabs */}
        <div className="flex border-b border-white/10">
          {(['global', 'friends'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors ${
                scope === s ? 'text-brand-400 border-b-2 border-brand-400' : 'text-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Period pills */}
        <div className="flex gap-2 px-4 py-2.5">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                period === value
                  ? 'bg-brand-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/15'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-white font-bold">No scores yet</p>
            <p className="text-gray-500 text-sm mt-1">
              {period === 'weekly'
                ? 'No activity this week'
                : period === 'monthly'
                ? 'No activity this month'
                : 'Be the first to play!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((u, i) => {
              const isMe = u.id === user?.id
              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                    isMe ? 'bg-brand-900/40 border border-brand-500/30' : 'bg-zinc-900'
                  }`}
                >
                  <span className="w-8 text-center text-xl">
                    {i < 3 ? MEDALS[i] : <span className="text-gray-500 font-bold text-sm">{i + 1}</span>}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${isMe ? 'text-brand-300' : 'text-white'}`}>
                      {u.username} {isMe && '(you)'}
                    </p>
                  </div>
                  <p className="text-white font-black">{u.totalScore}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
