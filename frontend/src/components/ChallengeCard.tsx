import { useNavigate } from 'react-router-dom'
import type { Challenge } from '../types'

interface Props {
  challenge: Challenge
  isSent?: boolean
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

export default function ChallengeCard({ challenge, isSent = false }: Props) {
  const navigate = useNavigate()
  const isAnswered = !!challenge.guess

  function handleTap() {
    if (!isSent && !isAnswered) navigate(`/challenge/${challenge.id}`)
  }

  const person = isSent ? challenge.receiver : challenge.sender

  return (
    <div
      onClick={handleTap}
      className={`relative rounded-2xl overflow-hidden bg-zinc-900 select-none ${
        !isSent && !isAnswered ? 'cursor-pointer active:scale-95 transition-transform' : ''
      }`}
    >
      {/* Photo */}
      <div className="w-full relative">
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
        {!isSent && !isAnswered && (
          <span className="w-2.5 h-2.5 rounded-full bg-brand-400 flex-shrink-0" />
        )}
      </div>
    </div>
  )
}
