import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { Challenge, Comment, PublicUser, Reaction } from '../types'
import { reactionsApi, commentsApi } from '../api'
import { useAuth } from '../context/AuthContext'
import Avatar from './ui/Avatar'
import Icon from './ui/Icon'

const REACTION_EMOJIS = ['👍', '👎', '🫶', '👌', '🤙', '🖕', '✌️', '🙌', '🤟', '🤘', '🙏']

interface Props {
  challenge: Challenge
  isSent?: boolean
  defaultMinimized?: boolean
  recipients?: PublicUser[]
  answeredCount?: number
  /** Sent tab: each recipient's guess, for the group score line */
  results?: { user: PublicUser; guess: Challenge['guess'] }[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function ChallengeCard({ challenge, isSent = false, defaultMinimized = false, recipients, answeredCount, results }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAnswered = !!challenge.guess
  const [isMinimized, setIsMinimized] = useState(defaultMinimized)

  // Reactions state (optimistic) — sync when server data changes
  const [reactions, setReactions] = useState<Reaction[]>(challenge.reactions ?? [])
  const reactionKey = (challenge.reactions ?? []).map(r => r.id).join(',')
  useEffect(() => { setReactions(challenge.reactions ?? []) }, [reactionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Comments state (optimistic) — sync when server data changes
  const [comments, setComments] = useState<Comment[]>(challenge.comments ?? [])
  const commentKey = (challenge.comments ?? []).map(c => c.id).join(',')
  useEffect(() => { setComments(challenge.comments ?? []) }, [commentKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showReactionsPopup, setShowReactionsPopup] = useState(false)
  const [reactionsFilter, setReactionsFilter] = useState<string | null>(null)
  const [showAllComments, setShowAllComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Lock body scroll while reactions popup is open
  useEffect(() => {
    if (!showReactionsPopup) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [showReactionsPopup])

  function handleTap() {
    if (!isSent && !isAnswered) navigate(`/challenge/${challenge.id}`)
  }

  const person = isSent ? challenge.receiver : challenge.sender
  const totalRecipients = recipients?.length ?? 1
  const resolvedAnsweredCount = answeredCount ?? (isAnswered ? 1 : 0)
  const allAnswered = resolvedAnsweredCount === totalRecipients
  const displayName = isSent && recipients && recipients.length > 0
    ? recipients.map((r) => r.username).join(', ')
    : person?.username ?? ''
  const coRecipientNames = !isSent ? (challenge.coRecipients ?? []).map((r) => r.username) : []

  // A slight, stable tilt per card so the feed looks taped in by hand
  const tilt = ((challenge.id.charCodeAt(challenge.id.length - 1) % 5) - 2) * 0.35

  const status: { label: string; tone: 'score' | 'zero' | 'partial' | 'done' | 'waiting' } | null = isSent
    ? totalRecipients > 1
      ? { label: `${resolvedAnsweredCount}/${totalRecipients} got it`, tone: allAnswered ? 'done' : resolvedAnsweredCount > 0 ? 'partial' : 'waiting' }
      : isAnswered
        ? { label: `+${challenge.guess!.points}`, tone: challenge.guess!.points > 0 ? 'score' : 'zero' }
        : { label: 'waiting…', tone: 'waiting' }
    : isAnswered && challenge.guess
      ? { label: `+${challenge.guess.points}`, tone: challenge.guess.points > 0 ? 'score' : 'zero' }
      : null

  const title = isSent ? `to ${displayName}` : `${displayName} sent you one`
  const meta = isSent
    ? totalRecipients === 1 && isAnswered
      ? `answered ${timeAgo(challenge.guess!.createdAt)}`
      : `sent ${timeAgo(challenge.createdAt)}`
    : coRecipientNames.length > 0
      ? `${timeAgo(challenge.createdAt)} · also sent to ${coRecipientNames.join(', ')}`
      : timeAgo(challenge.createdAt)

  // Who scored what. Sent: every recipient. Inbox: the others, once you've guessed.
  const scoreLine: { name: string; points: number | null }[] = isSent
    ? (results ?? []).map((r) => ({ name: r.user.username, points: r.guess ? r.guess.points : null }))
    : (challenge.coResults ?? []).map((r) => ({ name: r.user.username, points: r.points }))
  const stumperEarned = isSent ? (results ?? []).reduce((sum, r) => sum + (r.guess?.senderPoints ?? 0), 0) : 0
  const progress = challenge.groupProgress

  // Show social features only when photo is visible and accessible
  const photoVisible = !isMinimized && (isSent || isAnswered)

  // Group reactions by emoji
  const reactionCounts = REACTION_EMOJIS.map((emoji) => {
    const group = reactions.filter((r) => r.emoji === emoji)
    const myReaction = group.find((r) => r.userId === user?.id)
    return { emoji, count: group.length, reacted: !!myReaction }
  })

  async function handleReaction(emoji: string) {
    const already = reactions.find((r) => r.userId === user?.id && r.emoji === emoji)
    // Optimistic update
    if (already) {
      setReactions((prev) => prev.filter((r) => !(r.userId === user?.id && r.emoji === emoji)))
    } else {
      setReactions((prev) => [
        ...prev,
        { id: 'optimistic', emoji, userId: user!.id, user: { id: user!.id, username: user!.username } },
      ])
    }
    try {
      const res = await reactionsApi.toggle(challenge.id, emoji)
      const real = res.reaction
      if (res.action === 'added' && real) {
        // Swap the placeholder for the saved reaction (the socket echo may have landed first)
        setReactions((prev) => [
          ...prev.filter((r) => r.id !== real.id && !(r.id === 'optimistic' && r.userId === real.userId && r.emoji === real.emoji)),
          real,
        ])
      }
    } catch {
      // Revert on failure
      setReactions(challenge.reactions ?? [])
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    const text = commentText.trim()
    if (!text || submittingComment) return
    setSubmittingComment(true)
    try {
      const { comment } = await commentsApi.add(challenge.id, text)
      // The socket echo can arrive before this response — don't show it twice
      setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]))
      setCommentText('')
    } catch {
      // ignore
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleDeleteComment(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    try {
      await commentsApi.delete(challenge.id, commentId)
    } catch {
      setComments(challenge.comments ?? [])
    }
  }

  return (
    <article className="polaroid select-none isolate" style={{ transform: `rotate(${tilt}deg)` }}>
      <span className="tape" aria-hidden="true" />

      {/* Photo */}
      {!isMinimized && (
        <div
          onClick={handleTap}
          className={`relative overflow-hidden bg-grid/40 ${!isSent && !isAnswered ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
        >
          <img
            src={challenge.photoUrl}
            alt={!isSent && !isAnswered ? 'Hidden fingle — guess to reveal' : `Fingle from ${challenge.sender?.username ?? 'you'}`}
            className={`w-full h-auto block transition-all duration-300 ${!isSent && !isAnswered ? 'blur-2xl scale-110' : ''}`}
          />

          {/* Inbox: locked until guessed */}
          {!isSent && !isAnswered && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="font-marker text-7xl text-white -rotate-6" style={{ textShadow: '3px 3px 0 #1F3BA6' }}>???</span>
              <span className="font-marker text-lg text-white bg-pen px-4 py-1.5 rotate-1" style={{ borderRadius: '12px 4px 14px 5px' }}>
                tap to guess
              </span>
            </div>
          )}

          {status && <StatusChip {...status} className="absolute top-2.5 right-2.5" />}

          {/* Emoji picker + reaction stickers */}
          {photoVisible && (
            <>
              {showEmojiPicker && (
                <div className="absolute bottom-14 left-2 right-2 sketch p-2 flex flex-wrap gap-1 justify-center z-20">
                  {REACTION_EMOJIS.map((emoji) => {
                    const entry = reactionCounts.find((r) => r.emoji === emoji)
                    return (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReaction(emoji)
                          setShowEmojiPicker(false)
                        }}
                        className={`text-2xl w-10 h-10 rounded-full transition-transform active:scale-90 ${entry?.reacted ? 'bg-hi' : ''}`}
                        aria-label={`React ${emoji}`}
                      >
                        {emoji}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="absolute bottom-2.5 right-2.5 flex flex-wrap justify-end items-center gap-1 max-w-[70%]">
                {reactionCounts
                  .filter(({ count }) => count > 0)
                  .map(({ emoji, count, reacted }) => (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation()
                        setReactionsFilter(null)
                        setShowReactionsPopup(true)
                      }}
                      className={`flex items-center gap-0.5 px-2 py-0.5 text-base border-2 border-pen ${reacted ? 'bg-hi' : 'bg-white'}`}
                      style={{ borderRadius: '10px 4px 12px 5px' }}
                    >
                      <span>{emoji}</span>
                      {count > 1 && <span className="text-sm leading-none">{count}</span>}
                    </button>
                  ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEmojiPicker((v) => !v)
                }}
                className={`absolute bottom-2.5 left-2.5 w-10 h-10 rounded-full border-2 border-pen flex items-center justify-center text-xl z-10 ${showEmojiPicker ? 'bg-hi' : 'bg-white'}`}
                aria-label="Add a reaction"
              >
                {reactionCounts.find(({ reacted }) => reacted)?.emoji ?? <Icon name="smile" className="w-6 h-6" />}
              </button>
            </>
          )}
        </div>
      )}

      {/* Reactions sheet — portaled to body to escape the card's stacking context */}
      {showReactionsPopup && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center" onClick={() => setShowReactionsPopup(false)}>
          <div className="absolute inset-0 bg-pen/30" />
          <div
            className="relative w-full max-w-md graph border-t-2 border-pen rounded-t-3xl max-h-[60vh] flex flex-col text-pen"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h3 className="font-marker text-2xl">reactions <span className="text-pen-soft">({reactions.length})</span></h3>
              <button onClick={() => setShowReactionsPopup(false)} className="p-1" aria-label="Close">
                <Icon name="close" />
              </button>
            </div>

            <div className="flex gap-2 px-5 pb-3 overflow-x-auto">
              <button
                onClick={() => setReactionsFilter(null)}
                className={`px-3 py-1 text-base border-2 border-pen flex-shrink-0 ${reactionsFilter === null ? 'bg-hi' : 'bg-white'}`}
                style={{ borderRadius: '10px 4px 12px 5px' }}
              >
                all
              </button>
              {reactionCounts
                .filter(({ count }) => count > 0)
                .map(({ emoji, count }) => (
                  <button
                    key={emoji}
                    onClick={() => setReactionsFilter(emoji)}
                    className={`px-3 py-1 text-base border-2 border-pen flex-shrink-0 flex items-center gap-1 ${reactionsFilter === emoji ? 'bg-hi' : 'bg-white'}`}
                    style={{ borderRadius: '10px 4px 12px 5px' }}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                ))}
            </div>

            <div className="overflow-y-auto px-5 pb-6 divide-y-2 divide-dashed divide-pen-faint/60">
              {reactions
                .filter((r) => reactionsFilter === null || r.emoji === reactionsFilter)
                .map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={r.user.username} size="sm" />
                    <p className="flex-1 min-w-0 text-lg truncate">
                      {r.user.username}
                      {r.userId === user?.id && <span className="text-pen-soft ml-1.5">(you)</span>}
                    </p>
                    <span className="text-2xl flex-shrink-0">{r.emoji}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Caption, written on the polaroid */}
      <div className="flex items-center gap-2.5 pt-2.5 px-1">
        {isSent && totalRecipients > 1 ? (
          <span className="w-7 h-7 flex-shrink-0 rounded-full border-2 border-pen bg-white inline-flex items-center justify-center" aria-hidden="true">
            <Icon name="users" className="w-4 h-4" />
          </span>
        ) : (
          <Avatar name={isSent ? (recipients?.[0]?.username ?? displayName) : displayName} size="sm" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-lg leading-tight truncate">{title}</p>
          <p className="text-sm text-pen-soft leading-tight truncate">{meta}</p>
        </div>
        {!isSent && !isAnswered && !isMinimized && (
          <span className="w-3 h-3 rounded-full bg-redpen flex-shrink-0" aria-label="New" />
        )}
        {isMinimized && (
          <>
            {(isSent || isAnswered) && comments.length > 0 && (
              <span className="text-sm text-pen-soft flex-shrink-0">{comments.length} note{comments.length > 1 ? 's' : ''}</span>
            )}
            {status ? (
              <StatusChip {...status} />
            ) : (
              <span className="font-marker text-base text-redpen flex-shrink-0">new!</span>
            )}
          </>
        )}
        <button
          onClick={() => setIsMinimized((v) => !v)}
          className="text-pen-soft flex-shrink-0 p-1"
          aria-label={isMinimized ? 'Show photo' : 'Hide photo'}
        >
          <Icon name="chevron" className={`w-5 h-5 transition-transform duration-200 ${isMinimized ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Group scorecard */}
      {(scoreLine.length > 1 || (isSent && stumperEarned > 0) || (!isSent && scoreLine.length > 0)) && (
        <div className="mx-1 mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-base">
          {scoreLine.map(({ name, points }) => (
            <span key={name} className="whitespace-nowrap">
              <span className={`font-marker text-sm mr-1 ${points !== null ? 'hi' : 'text-pen-soft'}`}>{name}</span>
              {points === null ? (
                <span className="text-pen-faint">…</span>
              ) : (
                <span className={points > 0 ? 'text-redpen' : 'text-pen-soft'}>+{points}</span>
              )}
            </span>
          ))}
          {stumperEarned > 0 && (
            <span className="hi whitespace-nowrap">you got +{stumperEarned} for stumping</span>
          )}
        </div>
      )}
      {!isSent && !isAnswered && progress && progress.total > 1 && progress.guessed > 0 && (
        <p className="mx-1 mt-1.5 text-base">
          <span className="hi">{progress.cracked} of {progress.total} cracked it</span>
          {progress.guessed > progress.cracked && <span className="text-pen-soft">, {progress.guessed - progress.cracked} got stumped</span>}
        </p>
      )}

      {/* Comments — notes in the margin */}
      {photoVisible && (
        <div className="mx-1 mt-2.5 pt-2 border-t-2 border-dashed border-pen-faint space-y-1.5">
          {(() => {
            const visible = showAllComments ? comments : comments.slice(0, 3)
            const hidden = comments.length - 3
            return (
              <>
                {visible.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <p className="flex-1 min-w-0 text-base leading-snug break-words">
                      <span className="font-marker text-sm mr-1.5">{c.user.username}</span>
                      {c.text}
                    </p>
                    {c.userId === user?.id && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-pen-faint hover:text-redpen flex-shrink-0 p-0.5"
                        aria-label="Delete comment"
                      >
                        <Icon name="close" className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {!showAllComments && hidden > 0 && (
                  <button onClick={() => setShowAllComments(true)} className="text-sm text-pen-soft link">
                    {hidden} more note{hidden > 1 ? 's' : ''}
                  </button>
                )}
              </>
            )
          })()}
          <form onSubmit={handleAddComment} className="flex items-end gap-3 pt-1 pb-0.5">
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={500}
              placeholder="write something…"
              aria-label="Add a comment"
              className="flex-1 min-w-0 bg-transparent border-b-2 border-pen-faint focus:border-pen outline-none text-base py-1 placeholder-pen-faint"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="font-marker text-lg text-redpen disabled:opacity-30 pb-0.5"
            >
              post
            </button>
          </form>
        </div>
      )}
    </article>
  )
}

function StatusChip({ label, tone, className = '' }: { label: string; tone: 'score' | 'zero' | 'partial' | 'done' | 'waiting'; className?: string }) {
  const styles = {
    score: 'text-redpen border-redpen bg-white rotate-6 text-xl',
    zero: 'text-pen-soft border-pen-soft bg-white rotate-3 text-lg',
    partial: 'text-pen border-pen bg-hi -rotate-2 text-base',
    done: 'text-pen border-pen bg-marker-green -rotate-2 text-base',
    waiting: 'text-pen-soft border-pen-faint bg-white text-base',
  }[tone]
  return (
    <span
      className={`font-marker leading-none px-2.5 py-1 border-2 flex-shrink-0 ${styles} ${className}`}
      style={{ borderRadius: '50% 45% 55% 48% / 55% 50% 48% 52%' }}
    >
      {label}
    </span>
  )
}
