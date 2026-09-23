import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { challengesApi } from '../api'
import type { Challenge, FingerName } from '../types'
import CountPicker from '../components/CountPicker'
import FingerPicker from '../components/FingerPicker'
import PointsAnimation from '../components/PointsAnimation'
import Icon from '../components/ui/Icon'
import { useAuth } from '../context/AuthContext'
import { useStats } from '../hooks/useStats'
import type { GuessProgress } from '../types'

type Step = 'count' | 'fingers' | 'reveal'

interface RevealData {
  points: number
  isCountCorrect: boolean
  isFingersCorrect: boolean
  correctCount: number
  correctFingers: FingerName[]
  photoUrl: string
  quickDraw?: boolean
}

const QUICK_DRAW_MS = 60 * 60 * 1000

// Minutes left to earn the quick-draw bonus, ticking while the page is open
function useQuickDrawMinutes(sentAt: string | undefined): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  if (!sentAt) return 0
  return Math.max(0, Math.ceil((new Date(sentAt).getTime() + QUICK_DRAW_MS - now) / 60_000))
}

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const { stats } = useStats()
  const [progress, setProgress] = useState<GuessProgress | undefined>(undefined)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('count')
  const [countGuess, setCountGuess] = useState<number>(0)
  const [countCorrect, setCountCorrect] = useState(false)
  const [actualCount, setActualCount] = useState<number | undefined>(undefined)
  const [selectedFingers, setSelectedFingers] = useState<FingerName[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [reveal, setReveal] = useState<RevealData | null>(null)

  useEffect(() => {
    challengesApi
      .getReceived()
      .then(({ challenges }) => {
        const c = challenges.find((c) => c.id === id)
        if (!c) { navigate('/'); return }
        if (c.guess) {
          setChallenge(c)
          setReveal({
            points: c.guess.points,
            isCountCorrect: c.guess.isCountCorrect,
            isFingersCorrect: c.guess.isFingersCorrect,
            correctCount: c.fingerCount,
            correctFingers: c.whichFingers,
            photoUrl: c.photoUrl,
            quickDraw: c.guess.quickDraw,
          })
          setStep('reveal')
        } else {
          setChallenge(c)
        }
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  async function handleCountGuess(count: number) {
    if (!challenge) return
    setCountGuess(count)
    setSubmitting(true)
    try {
      const { isCorrect, correctCount } = await challengesApi.checkCount(challenge.id, count)
      setCountCorrect(isCorrect)
      if (!isCorrect && correctCount !== undefined) setActualCount(correctCount)

      if (challenge.fingerCount === 5) {
        const allFingers: FingerName[] = ['thumb', 'index', 'middle', 'ring', 'pinky']
        const { result, progress } = await challengesApi.guess(challenge.id, count, allFingers)
        setReveal(result)
        setProgress(progress)
        setStep('reveal')
        refreshUser()
      } else {
        setStep('fingers')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFingersSubmit() {
    if (!challenge) return
    setSubmitting(true)
    try {
      const { result, progress } = await challengesApi.guess(challenge.id, countGuess, selectedFingers)
      setReveal(result)
      setProgress(progress)
      setStep('reveal')
      refreshUser()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  function toggleFinger(finger: FingerName) {
    setSelectedFingers((prev) =>
      prev.includes(finger) ? prev.filter((f) => f !== finger) : [...prev, finger],
    )
  }

  const quickDrawMinutes = useQuickDrawMinutes(challenge?.createdAt)

  if (loading || !challenge) {
    return (
      <div className="min-h-full flex items-center justify-center font-marker text-2xl text-pen-soft">
        hang on…
      </div>
    )
  }

  const revealed = step === 'reveal'
  const stakes = [
    stats && stats.hotStreak >= 2 ? `hot streak ${stats.hotStreak} on the line` : null,
    quickDrawMinutes > 0 ? `quick draw +5 for ${quickDrawMinutes} more min` : null,
  ].filter(Boolean)

  return (
    <div className="min-h-full flex flex-col">
      <div className="flex items-center px-3 py-2 safe-top">
        <button onClick={() => navigate('/')} className="p-2" aria-label="Back to feed">
          <Icon name="back" />
        </button>
        <p className="flex-1 text-center text-xl mr-10">
          from <span className="font-marker">{challenge.sender?.username}</span>
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-8 py-3">
        <div className="polaroid w-full max-w-sm" style={{ transform: 'rotate(-1.2deg)' }}>
          <span className="tape" aria-hidden="true" />
          <div className="overflow-hidden bg-grid/40">
            <img
              src={reveal?.photoUrl ?? challenge.photoUrl}
              alt={revealed ? `Fingle from ${challenge.sender?.username}` : 'Hidden fingle'}
              className={`w-full max-h-[34vh] object-contain ${revealed ? 'animate-unblur' : 'blur-2xl scale-110'}`}
            />
          </div>
        </div>
      </div>

      <div className="graph border-t-2 border-pen rounded-t-3xl px-5 pt-5 pb-6">
        {!revealed && stakes.length > 0 && (
          <p className="text-center text-base text-pen-soft -mt-1 mb-3">{stakes.join(' · ')}</p>
        )}
        {step === 'count' && (
          <CountPicker onSelect={handleCountGuess} disabled={submitting} />
        )}
        {step === 'fingers' && (
          <FingerPicker
            count={countGuess}
            freeMode={!countCorrect}
            actualCount={actualCount}
            selected={selectedFingers}
            onToggle={toggleFinger}
            onSubmit={handleFingersSubmit}
            disabled={submitting}
          />
        )}
        {revealed && reveal && (
          <>
            <PointsAnimation
              points={reveal.points}
              isCountCorrect={reveal.isCountCorrect}
              isFingersCorrect={reveal.isFingersCorrect}
              correctCount={reveal.correctCount}
              correctFingers={reveal.correctFingers}
              quickDraw={reveal.quickDraw}
              progress={progress}
            />
            <button onClick={() => navigate('/')} className="btn-pen w-full mt-6">
              back to the feed
            </button>
          </>
        )}
      </div>
    </div>
  )
}
