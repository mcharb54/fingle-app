import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Challenge } from '../types'

interface Props {
  challenge: Challenge
  isSent?: boolean
  defaultMinimized?: boolean
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

export default function ChallengeCard({ challenge, isSent = false, defaultMinimized = false }: Props) {
  const navigate = useNavigate()
  const isAnswered = !!challenge.guess
  const [isMinimized, setIsMinimized] = useState(defaultMinimized)

  function handleTap() {
    if (!isSent && !isAnswered) navigate(`/challenge/${challenge.id}`)
  }

  const person = isSent ? challenge.receiver : challenge.sender

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-zinc-900 select-none"
    >
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
              !isSent && !isAnswered ? 'blur-xl scale-105' : ''
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
                isAnswered
                  ? challenge.guess!.points > 0
                    ? 'bg-green-500'
                    : 'bg-gray-600'
                  : 'bg-black/60 text-gray-300'
              }`}
            >
              {isAnswered ? `+${challenge.guess!.points} pts` : 'Waiting…'}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
          {person?.username[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate text-white">
            {isSent ? 'To ' : ''}{person?.username}
          </p>
          <p className="text-gray-500 text-xs">
            {isSent
              ? isAnswered
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
                ? isAnswered
                  ? challenge.guess!.points > 0
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
              ? isAnswered
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
    </div>
  )
}
