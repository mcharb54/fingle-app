import { useEffect, useState } from 'react'
import { challengesApi } from '../api'
import type { Challenge, PublicUser } from '../types'
import ChallengeCard from '../components/ChallengeCard'
import { useSocket } from '../hooks/useSocket'

interface SentGroup {
  main: Challenge
  recipients: PublicUser[]
  answeredCount: number
}

function groupSentByPhoto(challenges: Challenge[]): SentGroup[] {
  const map = new Map<string, SentGroup>()
  for (const c of challenges) {
    if (!map.has(c.photoUrl)) {
      map.set(c.photoUrl, {
        main: c,
        recipients: c.receiver ? [c.receiver] : [],
        answeredCount: c.guess ? 1 : 0,
      })
    } else {
      const g = map.get(c.photoUrl)!
      if (c.receiver) g.recipients.push(c.receiver)
      if (c.guess) g.answeredCount++
    }
  }
  return [...map.values()]
}

export default function Feed() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox')
  const minimizePhotos = localStorage.getItem('fingle_minimize_photos') === 'true'

  async function load() {
    try {
      if (tab === 'inbox') {
        const { challenges } = await challengesApi.getReceived()
        setChallenges(challenges)
      } else {
        const { challenges } = await challengesApi.getSent()
        setChallenges(challenges)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useSocket({
    new_challenge: () => {
      if (tab === 'inbox') load()
    },
    challenge_guessed: () => {
      if (tab === 'sent') load()
    },
  })

  const unread = challenges.filter((c) => !c.guess && !c.seen).length

  return (
    <div className="min-h-full bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 safe-top">
        <div className="flex items-center px-4 py-3">
          <h1 className="text-2xl font-black text-brand-400 flex-1">Fingle</h1>
          {unread > 0 && (
            <span className="bg-brand-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {unread} new
            </span>
          )}
        </div>
        <div className="flex border-b border-white/10">
          {(['inbox', 'sent'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors ${
                tab === t ? 'text-brand-400 border-b-2 border-brand-400' : 'text-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-zinc-900 animate-pulse h-72" />
          ))
        ) : challenges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">✌️</div>
            <p className="text-white font-bold text-xl">No challenges yet</p>
            <p className="text-gray-500 text-sm mt-2">
              {tab === 'inbox' ? 'Ask a friend to send you one!' : 'Send a challenge to a friend!'}
            </p>
          </div>
        ) : (
          tab === 'sent'
            ? groupSentByPhoto(challenges).map(({ main, recipients, answeredCount }) => (
                <ChallengeCard
                  key={main.id}
                  challenge={main}
                  isSent
                  defaultMinimized={minimizePhotos}
                  recipients={recipients}
                  answeredCount={answeredCount}
                />
              ))
            : challenges.map((c) => <ChallengeCard key={c.id} challenge={c} defaultMinimized={minimizePhotos} />)
        )}
      </div>
    </div>
  )
}
