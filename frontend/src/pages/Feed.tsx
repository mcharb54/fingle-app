import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { challengesApi } from '../api'
import type { Challenge, Comment, PublicUser } from '../types'
import ChallengeCard from '../components/ChallengeCard'
import { useSocket } from '../hooks/useSocket'
import HandGlyph from '../components/ui/HandGlyph'
import { StreakChip } from '../components/ui/Progress'
import { useStats } from '../hooks/useStats'

const PAGE_SIZE = 5

interface SentGroup {
  main: Challenge
  challengeIds: string[]
  recipients: PublicUser[]
  answeredCount: number
  results: { user: PublicUser; guess: Challenge['guess'] }[]
}

// Collapse one multi-recipient send into a single card. Every row in a group
// already carries the full shared thread, so the first row's comments/reactions are used as-is.
function groupSent(challenges: Challenge[]): SentGroup[] {
  const map = new Map<string, SentGroup>()
  for (const c of challenges) {
    const g = map.get(c.groupId)
    if (!g) {
      map.set(c.groupId, {
        main: c,
        challengeIds: [c.id],
        recipients: c.receiver ? [c.receiver] : [],
        answeredCount: c.guess ? 1 : 0,
        results: c.receiver ? [{ user: c.receiver, guess: c.guess }] : [],
      })
    } else {
      g.challengeIds.push(c.id)
      if (c.receiver) g.recipients.push(c.receiver)
      if (c.receiver) g.results.push({ user: c.receiver, guess: c.guess })
      if (c.guess) g.answeredCount++
    }
  }
  return [...map.values()]
}

export default function Feed() {
  const { stats } = useStats()
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
    // Events emitted while disconnected are lost, so resync after (re)connecting
    connect: () => {
      if (!loading) load()
    },
    new_challenge: () => {
      if (tab === 'inbox') load()
    },
    challenge_guessed: () => {
      if (tab === 'sent') load()
    },
    reaction_updated: (data: unknown) => {
      const evt = data as {
        groupId: string
        emoji: string
        action: 'added' | 'removed'
        reactionId: string
        byUserId: string
        byUsername: string
      }
      // Apply directly to local state for immediate feedback
      setChallenges((prev) =>
        prev.map((c) => {
          // The thread is shared by every challenge in the group
          if (c.groupId !== evt.groupId) return c
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
    comment_updated: (data: unknown) => {
      const evt = data as {
        groupId: string
        action: 'added' | 'deleted'
        comment?: Comment
        commentId?: string
      }
      // Apply directly to local state for immediate feedback
      setChallenges((prev) =>
        prev.map((c) => {
          // The thread is shared by every challenge in the group
          if (c.groupId !== evt.groupId) return c
          const comments = c.comments ?? []
          if (evt.action === 'added' && evt.comment) {
            // Avoid duplicates (e.g. the commenter already appended via the API response)
            if (comments.some((cm) => cm.id === evt.comment!.id)) return c
            return { ...c, comments: [...comments, evt.comment] }
          } else if (evt.action === 'deleted' && evt.commentId) {
            return { ...c, comments: comments.filter((cm) => cm.id !== evt.commentId) }
          }
          return c
        }),
      )
    },
  })

  const unread = challenges.filter((c) => !c.guess && !c.seen).length

  const sentGroups = tab === 'sent' ? groupSent(challenges) : []
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
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 paper-bar safe-top">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <h1 className="font-marker text-3xl leading-none flex-1"><span className="hi">fingle</span></h1>
          {stats && <StreakChip daily={stats.daily} />}
          {stats && (
            <span className="text-lg leading-none" title={`${stats.xp} points`}>
              lv <span className="text-2xl">{stats.level}</span>
            </span>
          )}
        </div>
        <div className="flex gap-6 px-4 border-b-2 border-dashed border-pen-faint">
          {(['inbox', 'sent'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-marker text-lg pb-1.5 pt-1 transition-colors ${tab === t ? 'text-pen' : 'text-pen-faint'}`}
            >
              <span className={tab === t ? 'hi' : ''}>{t}</span>
              {t === 'inbox' && unread > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-redpen text-white font-sans text-sm leading-none align-middle">
                  {unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-6 pb-8 space-y-7">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="polaroid animate-pulse" style={{ transform: `rotate(${i ? 0.6 : -0.6}deg)` }}>
              <div className="h-72 bg-grid/60" />
              <div className="h-5 w-40 mt-3 bg-grid/80 rounded" />
            </div>
          ))
        ) : challenges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <HandGlyph raised={['index', 'middle']} className="w-24 text-pen -rotate-6" />
            <p className="font-marker text-2xl mt-5">nothing here yet</p>
            <p className="text-lg text-pen-soft mt-1">
              {tab === 'inbox' ? 'when a friend sends you a fingle, it shows up here' : 'snap your fingers and stump a friend'}
            </p>
          </div>
        ) : tab === 'sent' ? (
          sentGroups.slice(0, effectiveVisible).map(({ main, challengeIds, recipients, answeredCount, results }) => (
            <div key={main.id} id={`challenge-${main.id}`}>
              {/* Extra anchor IDs so notification highlights work for any challenge in the group */}
              {challengeIds.filter(cid => cid !== main.id).map(cid => (
                <div key={cid} id={`challenge-${cid}`} />
              ))}
              <ChallengeCard
                challenge={main}
                isSent
                defaultMinimized={minimizePhotos && !(highlightId && challengeIds.includes(highlightId))}
                recipients={recipients}
                answeredCount={answeredCount}
                results={results}
              />
            </div>
          ))
        ) : (
          challenges.slice(0, effectiveVisible).map((c) => (
            <div key={c.id} id={`challenge-${c.id}`}>
              <ChallengeCard challenge={c} defaultMinimized={minimizePhotos && c.id !== highlightId} />
            </div>
          ))
        )}

        {/* Sentinel for infinite scroll */}
        {!loading && hasMore && <div ref={sentinelRef} className="h-8" />}
      </div>
    </div>
  )
}
