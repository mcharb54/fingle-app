import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { challengesApi } from '../api'
import type { Challenge, FingerName } from '../types'
import CountPicker from '../components/CountPicker'
import FingerPicker from '../components/FingerPicker'
import PointsAnimation from '../components/PointsAnimation'

type Step = 'count' | 'fingers' | 'reveal'

interface RevealData {
  points: number
  isCountCorrect: boolean
  isFingersCorrect: boolean
  correctCount: number
  correctFingers: FingerName[]
  photoUrl: string
}

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('count')
  const [countGuess, setCountGuess] = useState<number>(0)
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
      const { isCorrect } = await challengesApi.checkCount(challenge.id, count)
      if (isCorrect) {
        setStep('fingers')
      } else {
        // Wrong count — store the final losing guess
        const { result } = await challengesApi.guess(challenge.id, count, [])
        setReveal(result)
        setStep('reveal')
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
      const { result } = await challengesApi.guess(challenge.id, countGuess, selectedFingers)
      setReveal(result)
      setStep('reveal')
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

  if (loading || !challenge) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex items-center px-4 py-3 safe-top">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors">
          ← Back
        </button>
        <p className="flex-1 text-center text-sm text-gray-400">
          From <span className="text-white font-semibold">{challenge.sender?.username}</span>
        </p>
      </div>

      <div className="relative flex-1 flex items-center justify-center bg-zinc-950 overflow-hidden">
        <img
          src={reveal?.photoUrl ?? challenge.photoUrl}
          alt="challenge"
          className={`w-full max-h-[55vh] object-contain transition-all duration-500 ${
            step !== 'reveal' ? 'blur-2xl scale-110' : ''
          }`}
        />
        {step === 'reveal' && reveal && (
          <PointsAnimation
            points={reveal.points}
            isCountCorrect={reveal.isCountCorrect}
            isFingersCorrect={reveal.isFingersCorrect}
            correctCount={reveal.correctCount}
            correctFingers={reveal.correctFingers}
          />
        )}
      </div>

      <div className="bg-zinc-900 rounded-t-3xl p-6 pb-8">
        {step === 'count' && (
          <CountPicker onSelect={handleCountGuess} disabled={submitting} />
        )}
        {step === 'fingers' && (
          <FingerPicker
            count={countGuess}
            selected={selectedFingers}
            onToggle={toggleFinger}
            onSubmit={handleFingersSubmit}
            disabled={submitting}
          />
        )}
        {step === 'reveal' && (
          <button
            onClick={() => navigate('/')}
            className="w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Back to feed
          </button>
        )}
      </div>
    </div>
  )
}
