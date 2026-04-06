import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { challengesApi } from '../api'
import type { Challenge, PublicUser } from '../types'
import ChallengeCard from '../components/ChallengeCard'
import { useSocket } from '../hooks/useSocket'

const PAGE_SIZE = 5

interface SentGroup {
  main: Challenge
  challengeIds: string[]
  recipients: PublicUser[]
  answeredCount: number
}

function groupSentByPhoto(challenges: Challenge[]): SentGroup[] {
  const map = new Map<string, SentGroup>()
  for (const c of challenges) {
    if (!map.has(c.photoUrl)) {
      map.set(c.photoUrl, {
        main: { ...c },
        challengeIds: [c.id],
        recipients: c.receiver ? [c.receiver] : [],
        answeredCount: c.guess ? 1 : 0,
      })
    } else {
      const g = map.get(c.photoUrl)!
      g.challengeIds.push(c.id)
      if (c.receiver) g.recipients.push(c.receiver)
      if (c.guess) g.answeredCount++
      // Merge comments and reactions from all challenges in the group
      const existingCommentIds = new Set((g.main.comments ?? []).map(cm => cm.id))
      for (const cm of c.comments ?? []) {
        if (!existingCommentIds.has(cm.id)) {
          g.main.comments = [...(g.main.comments ?? []), cm]
        }
      }
      const existingReactionIds = new Set((g.main.reactions ?? []).map(r => r.id))
      for (const r of c.reactions ?? []) {
        if (!existingReactionIds.has(r.id)) {
          g.main.reactions = [...(g.main.reactions ?? []), r]
        }
      }
    }
  }
  return [...map.values()]
}

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'inbox' | 'sent'>(
    searchParams.get('tab') === 'sent' ? 'sent' : 'inbox'
  )
  const [highlightId] = useState<string | null>(searchParams.get('highlight'))
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)
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
    setVisibleCount(PAGE_SIZE)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((n) => n + PAGE_SIZE)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading])

  // After data loads, scroll to highlighted card and clear URL params
  useEffect(() => {
    if (loading || !highlightId) return
    const el = document.getElementById(`challenge-${highlightId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setSearchParams({}, { replace: true })
    }
  }, [loading, highlightId, setSearchParams])

  useSocket({
    new_challenge: () => {
      if (tab === 'inbox') load()
    },
    challenge_guessed: () => {
      if (tab === 'sent') load()
    },
    reaction_updated: (data: unknown) => {
      const evt = data as {
        challengeId: string
        emoji: string
        action: 'added' | 'removed'
        reactionId: string
        byUserId: string
        byUsername: string
      }
      // Apply directly to local state for immediate feedback
      setChallenges((prev) =>
        prev.map((c) => {
          if (c.id !== evt.challengeId) return c
          const reactions = c.reactions ?? []
          if (evt.action === 'added') {
            // Avoid duplicates (e.g. from optimistic update)
            if (reactions.some((r) => r.id === evt.reactionId)) return c
            return {
              ...c,
              reactions: [
                // Replace any optimistic entry for this user+emoji
                ...reactions.filter(
                  (r) => !(r.id === 'optimistic' && r.userId === evt.byUserId && r.emoji === evt.emoji),
                ),
                {
                  id: evt.reactionId,
                  emoji: evt.emoji,
                  userId: evt.byUserId,
                  user: { id: evt.byUserId, username: evt.byUsername },
                },
              ],
            }
          } else {
            return {
              ...c,
              reactions: reactions.filter(
                (r) => !(r.userId === evt.byUserId && r.emoji === evt.emoji),
              ),
            }
          }
        }),
      )
    },
    comment_updated: () => load(),
  })

  const unread = challenges.filter((c) => !c.guess && !c.seen).length

  const sentGroups = tab === 'sent' ? groupSentByPhoto(challenges) : []
  const totalItems = tab === 'sent' ? sentGroups.length : challenges.length

  // Ensure the highlighted card is within the visible window
  const highlightIndex = highlightId
    ? tab === 'sent'
      ? sentGroups.findIndex(({ challengeIds }) => challengeIds.includes(highlightId))
      : challenges.findIndex((c) => c.id === highlightId)
    : -1
  const effectiveVisible = highlightIndex >= 0
    ? Math.max(visibleCount, highlightIndex + 1)
    : visibleCount

  const hasMore = effectiveVisible < totalItems

  return (
    <div className="min-h-full bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur border-b border-white/10 safe-top">
        <div className="flex items-center px-4 py-3">
          <h1 className="text-2xl font-black text-brand-400 flex-1">Fingle</h1>
          {tab === 'inbox' && unread > 0 && (
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
        ) : tab === 'sent' ? (
          sentGroups.slice(0, effectiveVisible).map(({ main, challengeIds, recipients, answeredCount }) => (
            <div key={main.id} id={`challenge-${main.id}`}>
              {/* Extra anchor IDs so notification highlights work for any challenge in the group */}
              {challengeIds.filter(cid => cid !== main.id).map(cid => (
                <div key={cid} id={`challenge-${cid}`} />
              ))}
              <ChallengeCard
                challenge={main}
                isSent
                defaultMinimized={minimizePhotos}
                recipients={recipients}
                answeredCount={answeredCount}
              />
            </div>
          ))
        ) : (
          challenges.slice(0, effectiveVisible).map((c) => (
            <div key={c.id} id={`challenge-${c.id}`}>
              <ChallengeCard challenge={c} defaultMinimized={minimizePhotos} />
            </div>
          ))
        )}

        {/* Sentinel for infinite scroll */}
        {!loading && hasMore && <div ref={sentinelRef} className="h-8" />}
      </div>
    </div>
  )
}
