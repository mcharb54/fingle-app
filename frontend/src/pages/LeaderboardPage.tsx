import { useEffect, useState } from 'react'
import { leaderboardApi } from '../api'
import type { PublicUser } from '../types'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/ui/Avatar'
import HandGlyph from '../components/ui/HandGlyph'

// Podium ranks get a highlighter circle; the rest are just written in
const PODIUM = ['bg-hi', 'bg-marker-blue', 'bg-marker-orange']

type Period = 'weekly' | 'monthly' | 'alltime'
const PERIODS: { value: Period; label: string }[] = [
  { value: 'weekly', label: 'this week' },
  { value: 'monthly', label: 'this month' },
  { value: 'alltime', label: 'all time' },
]

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [scope, setScope] = useState<'global' | 'friends'>('friends')
  const [period, setPeriod] = useState<Period>('weekly')
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
    <div className="min-h-full">
      <div className="sticky top-0 z-10 paper-bar safe-top">
        <div className="px-4 pt-3 pb-2">
          <h1 className="page-title"><span className="hi">the board</span></h1>
        </div>

        <div className="flex gap-6 px-4 border-b-2 border-dashed border-pen-faint">
          {(['friends', 'global'] as const).map((sc) => (
            <button
              key={sc}
              onClick={() => setScope(sc)}
              className={`font-marker text-lg pb-1.5 pt-1 ${scope === sc ? 'text-pen' : 'text-pen-faint'}`}
            >
              <span className={scope === sc ? 'hi' : ''}>{sc === 'global' ? 'everyone' : 'friends'}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-4 py-2.5">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`flex-1 py-1 text-base border-2 transition-colors ${
                period === value ? 'border-pen bg-white' : 'border-transparent text-pen-soft'
              }`}
              style={{ borderRadius: '50% 45% 55% 48% / 55% 50% 48% 52%' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-8">
        {loading ? (
          <div className="space-y-3 pt-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-grid/60 rounded animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <HandGlyph raised={['thumb']} className="w-20 text-pen -rotate-12" />
            <p className="font-marker text-2xl mt-4">no scores yet</p>
            <p className="text-lg text-pen-soft mt-1">
              {period === 'weekly'
                ? 'nobody has played this week'
                : period === 'monthly'
                ? 'nobody has played this month'
                : 'be the first on the board'}
            </p>
          </div>
        ) : (
          <ol className="divide-y-2 divide-dashed divide-pen-faint/60">
            {leaderboard.map((u, i) => {
              const isMe = u.id === user?.id
              return (
                <li key={u.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className={`w-9 h-9 flex-shrink-0 flex items-center justify-center font-marker text-lg ${
                      i < 3 ? `${PODIUM[i]} border-2 border-pen` : 'text-pen-soft'
                    }`}
                    style={i < 3 ? { borderRadius: '50% 45% 55% 48% / 55% 50% 48% 52%' } : undefined}
                  >
                    {i + 1}
                  </span>
                  <Avatar name={u.username} />
                  <p className="flex-1 min-w-0 text-xl truncate">
                    {isMe ? <span className="hi">{u.username} (you)</span> : u.username}
                  </p>
                  <p className="text-2xl tabular-nums">{u.totalScore}</p>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
