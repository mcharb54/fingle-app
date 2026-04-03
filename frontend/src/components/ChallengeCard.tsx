import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Challenge, Comment, PublicUser, Reaction } from '../types'
import { reactionsApi, commentsApi } from '../api'
import { useAuth } from '../context/AuthContext'

const REACTION_EMOJIS = ['👍', '👎', '🫶', '👌', '🤙', '🖕', '✌️', '🙌', '🤟', '🤘', '🙏']

interface Props {
  challenge: Challenge
  isSent?: boolean
  defaultMinimized?: boolean
  recipients?: PublicUser[]
  answeredCount?: number
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

export default function ChallengeCard({ challenge, isSent = false, defaultMinimized = false, recipients, answeredCount }: Props) {
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
      await reactionsApi.toggle(challenge.id, emoji)
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
      setComments((prev) => [...prev, comment])
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
    <div className="relative rounded-2xl overflow-hidden bg-zinc-900 select-none isolate">
      {/* Photo */}
      {!isMinimized && (
        <div
          onClick={handleTap}
          className={`w-full relative ${!isSent && !isAnswered ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
        >
          <img
            src={challenge.photoUrl}
            alt="challenge"
            className={`w-full h-auto block bg-zinc-950 transition-all duration-300 ${
              !isSent && !isAnswered ? 'blur-3xl scale-110' : ''
            }`}
          />

          {/* Inbox: lock overlay on unanswered */}
          {!isSent && !isAnswered && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
              <div className="text-6xl mb-3">🔒</div>
              <p className="text-white font-bold text-lg">Tap to guess</p>
              <p className="text-gray-300 text-sm mt-1">How many fingers?</p>
            </div>
          )}

          {/* Inbox: result badge */}
          {!isSent && isAnswered && challenge.guess && (
            <div
              className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold ${
                challenge.guess.points > 0 ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              +{challenge.guess.points} pts
            </div>
          )}

          {/* Sent: status badge */}
          {isSent && (
            <div
              className={`absolute top-3 right-3 rounded-full px-3 py-1 text-xs font-bold ${
                totalRecipients > 1
                  ? allAnswered
                    ? 'bg-green-500'
                    : resolvedAnsweredCount > 0
                      ? 'bg-yellow-500 text-black'
                      : 'bg-black/60 text-gray-300'
                  : isAnswered
                    ? challenge.guess!.points > 0
                      ? 'bg-green-500'
                      : 'bg-gray-600'
                    : 'bg-black/60 text-gray-300'
              }`}
            >
              {totalRecipients > 1
                ? `${resolvedAnsweredCount}/${totalRecipients} answered`
                : isAnswered ? `+${challenge.guess!.points} pts` : 'Waiting…'}
            </div>
          )}

          {/* Emoji picker + reaction tags overlay */}
          {photoVisible && (
            <>
              {/* Expanded emoji picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-2 right-2 bg-black/75 backdrop-blur-sm rounded-2xl p-2 flex flex-wrap gap-1.5 justify-center z-20">
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
                        className={`text-2xl p-1 rounded-full transition-transform hover:scale-110 active:scale-95 ${entry?.reacted ? 'bg-brand-500/40' : ''}`}
                      >
                        {emoji}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Reaction tags — bottom right (tap to view who reacted) */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1">
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
                      className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-base backdrop-blur-sm border transition-colors ${
                        reacted
                          ? 'bg-brand-500/60 border-brand-400'
                          : 'bg-black/60 border-white/20'
                      }`}
                    >
                      <span>{emoji}</span>
                      {count > 1 && <span className="text-xs text-white font-semibold leading-none">{count}</span>}
                    </button>
                  ))}
              </div>

              {/* Emoji picker trigger — bottom left */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowEmojiPicker((v) => !v)
                }}
                className={`absolute bottom-3 left-3 w-9 h-9 rounded-full flex items-center justify-center text-xl backdrop-blur-sm border transition-colors z-10 ${
                  showEmojiPicker
                    ? 'bg-white/25 border-white/40'
                    : 'bg-black/50 border-white/10'
                }`}
              >
                {reactionCounts.find(({ reacted }) => reacted)?.emoji ?? '🙂'}
              </button>
            </>
          )}
        </div>
      )}


      {/* Reactions popup — who reacted */}
      {showReactionsPopup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowReactionsPopup(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-md bg-zinc-900 rounded-t-2xl max-h-[60vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h3 className="text-white font-bold text-lg">Reactions ({reactions.length})</h3>
              <button
                onClick={() => setShowReactionsPopup(false)}
                className="text-gray-400 hover:text-white text-xl leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
              <button
                onClick={() => setReactionsFilter(null)}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors flex-shrink-0 ${
                  reactionsFilter === null ? 'bg-brand-500 text-white' : 'bg-zinc-800 text-gray-400'
                }`}
              >
                All
              </button>
              {reactionCounts
                .filter(({ count }) => count > 0)
                .map(({ emoji, count }) => (
                  <button
                    key={emoji}
                    onClick={() => setReactionsFilter(emoji)}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors flex-shrink-0 flex items-center gap-1 ${
                      reactionsFilter === emoji ? 'bg-brand-500 text-white' : 'bg-zinc-800 text-gray-400'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                ))}
            </div>

            {/* User list */}
            <div className="overflow-y-auto px-4 pb-4 space-y-3">
              {reactions
                .filter((r) => reactionsFilter === null || r.emoji === reactionsFilter)
                .map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {r.user.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {r.user.username}
                        {r.userId === user?.id && <span className="text-gray-500 font-normal ml-1">You</span>}
                      </p>
                    </div>
                    <span className="text-xl flex-shrink-0">{r.emoji}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {displayName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate text-white">
            {isSent ? 'To ' : ''}{displayName}
          </p>
          <p className="text-gray-500 text-xs">
            {isSent
              ? totalRecipients > 1
                ? `${resolvedAnsweredCount}/${totalRecipients} answered · ${timeAgo(challenge.createdAt)}`
                : isAnswered
                  ? `Answered · ${timeAgo(challenge.guess!.createdAt)}`
                  : `Sent · ${timeAgo(challenge.createdAt)}`
              : timeAgo(challenge.createdAt)}
          </p>
        </div>
        {!isSent && !isAnswered && !isMinimized && (
          <span className="w-2.5 h-2.5 rounded-full bg-brand-400 flex-shrink-0" />
        )}
        {/* Minimized status badge (inline when photo hidden) */}
        {isMinimized && (
          <span
            className={`text-xs font-bold rounded-full px-2.5 py-0.5 flex-shrink-0 ${
              isSent
                ? totalRecipients > 1
                  ? allAnswered
                    ? 'bg-green-500 text-white'
                    : resolvedAnsweredCount > 0
                      ? 'bg-yellow-500 text-black'
                      : 'bg-black/60 text-gray-300'
                  : isAnswered && challenge.guess
                    ? challenge.guess.points > 0
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-600 text-white'
                    : 'bg-black/60 text-gray-300'
                : isAnswered && challenge.guess
                  ? challenge.guess.points > 0
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-600 text-white'
                  : 'bg-brand-400/20 text-brand-400'
            }`}
          >
            {isSent
              ? totalRecipients > 1
                ? `${resolvedAnsweredCount}/${totalRecipients}`
                : isAnswered
                  ? `+${challenge.guess!.points} pts`
                  : 'Waiting…'
              : isAnswered && challenge.guess
                ? `+${challenge.guess.points} pts`
                : '●'}
          </span>
        )}
        <button
          onClick={() => setIsMinimized((v) => !v)}
          className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0 p-1"
          aria-label={isMinimized ? 'Expand photo' : 'Collapse photo'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 transition-transform duration-200 ${isMinimized ? '' : 'rotate-180'}`}
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Comments section */}
      {photoVisible && (
        <div className="px-4 pb-4 border-t border-white/10 mt-1 pt-3 space-y-2">
          {(() => {
            const visible = showAllComments ? comments : comments.slice(0, 3)
            const hidden = comments.length - 3
            return (
              <>
                {visible.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 group">
                    <div className="w-6 h-6 rounded-full bg-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {c.user.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-gray-300 mr-1">{c.user.username}</span>
                      <span className="text-xs text-gray-400 break-words">{c.text}</span>
                    </div>
                    {c.userId === user?.id && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity text-xs flex-shrink-0"
                        aria-label="Delete comment"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {!showAllComments && hidden > 0 && (
                  <button
                    onClick={() => setShowAllComments(true)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Show {hidden} more comment{hidden > 1 ? 's' : ''}
                  </button>
                )}
              </>
            )
          })()}
          <form onSubmit={handleAddComment} className="flex gap-2 mt-2">
            <input
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={500}
              placeholder="Add a comment…"
              className="flex-1 bg-zinc-800 rounded-full px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="text-brand-400 text-xs font-semibold disabled:opacity-40 transition-opacity"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
