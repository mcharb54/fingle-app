import { useState, useRef } from 'react'
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

  // Reactions state (optimistic)
  const [reactions, setReactions] = useState<Reaction[]>(challenge.reactions ?? [])
  // Comments state (optimistic)
  const [comments, setComments] = useState<Comment[]>(challenge.comments ?? [])
  const [showComments, setShowComments] = useState(false)
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
    <div className="relative rounded-2xl overflow-hidden bg-zinc-900 select-none">
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
        </div>
      )}

      {/* Reactions */}
      {photoVisible && (
        <div className="px-4 pt-3 flex gap-2 flex-wrap">
          {reactionCounts.map(({ emoji, count, reacted }) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm transition-colors ${
                reacted
                  ? 'bg-brand-500/30 border border-brand-400'
                  : 'bg-zinc-800 border border-transparent hover:bg-zinc-700'
              }`}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-xs text-gray-300">{count}</span>}
            </button>
          ))}
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
        {/* Comment toggle */}
        {photoVisible && (
          <button
            onClick={() => {
              setShowComments((v) => !v)
              if (!showComments) setTimeout(() => commentInputRef.current?.focus(), 100)
            }}
            className="text-gray-400 hover:text-gray-200 transition-colors flex-shrink-0 flex items-center gap-1 text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Z" clipRule="evenodd" />
            </svg>
            {comments.length > 0 && <span>{comments.length}</span>}
          </button>
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
      {photoVisible && showComments && (
        <div className="px-4 pb-4 border-t border-white/10 mt-1 pt-3 space-y-2">
          {comments.length === 0 && (
            <p className="text-gray-600 text-xs">No comments yet</p>
          )}
          {comments.map((c) => (
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
