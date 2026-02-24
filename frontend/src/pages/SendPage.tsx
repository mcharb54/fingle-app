import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { challengesApi, friendsApi } from '../api'
import type { FingerName, FriendEntry } from '../types'
import CameraCapture from '../components/CameraCapture'

type Step = 'camera' | 'tag' | 'pick-friend' | 'sending' | 'sent'

const FINGERS: { name: FingerName; label: string }[] = [
  { name: 'thumb', label: 'Thumb' },
  { name: 'index', label: 'Index' },
  { name: 'middle', label: 'Middle' },
  { name: 'ring', label: 'Ring' },
  { name: 'pinky', label: 'Pinky' },
]

const ALL_FINGERS = FINGERS.map((f) => f.name)

export default function SendPage() {
  const navigate = useNavigate()
  const capturedBlobRef = useRef<Blob | null>(null)

  const [step, setStep] = useState<Step>('camera')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fingerCount, setFingerCount] = useState<number>(1)
  const [selectedFingers, setSelectedFingers] = useState<FingerName[]>([])
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleCapture(blob: Blob, dataUrl: string) {
    capturedBlobRef.current = blob
    setPreviewUrl(dataUrl)
    setStep('tag')
  }

  function toggleFinger(name: FingerName) {
    setSelectedFingers((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name],
    )
  }

  function handleCountChange(count: number) {
    setFingerCount(count)
    if (count === 5) {
      setSelectedFingers(ALL_FINGERS)
    } else {
      setSelectedFingers((prev) => prev.slice(0, count))
    }
  }

  async function proceedToFriendPicker() {
    if (selectedFingers.length !== fingerCount) return
    setLoadingFriends(true)
    try {
      const { friends } = await friendsApi.getFriends()
      setFriends(friends)
      setStep('pick-friend')
    } catch {
      setError('Failed to load friends')
    } finally {
      setLoadingFriends(false)
    }
  }

  async function sendChallenge(friend: FriendEntry) {
    if (!capturedBlobRef.current) return
    setSending(true)
    setStep('sending')
    setError(null)
    try {
      const fd = new FormData()
      fd.append('photo', capturedBlobRef.current, 'challenge.jpg')
      fd.append('receiverId', friend.user.id)
      fd.append('fingerCount', String(fingerCount))
      fd.append('whichFingers', JSON.stringify(selectedFingers))
      await challengesApi.send(fd)
      setStep('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send challenge')
      setStep('pick-friend')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 safe-top">
        {step !== 'camera' && step !== 'sent' ? (
          <button
            onClick={() => setStep(step === 'pick-friend' ? 'tag' : 'camera')}
            className="text-gray-400 hover:text-white"
          >
            ← Back
          </button>
        ) : (
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            ← Feed
          </button>
        )}
        <h2 className="flex-1 text-center font-bold text-white">
          {step === 'camera' && 'New Challenge'}
          {step === 'tag' && 'Tag your fingers'}
          {step === 'pick-friend' && 'Send to…'}
          {step === 'sending' && 'Sending…'}
          {step === 'sent' && 'Sent!'}
        </h2>
        <div className="w-12" />
      </div>

      {/* Camera */}
      {step === 'camera' && (
        <div className="flex-1 relative">
          <CameraCapture onCapture={handleCapture} />
        </div>
      )}

      {/* Tag fingers */}
      {step === 'tag' && previewUrl && (
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1">
            <img src={previewUrl} alt="captured" className="w-full h-full object-contain bg-zinc-950" />
          </div>

          <div className="bg-zinc-900 rounded-t-3xl p-6 space-y-5">
            {/* Count selector */}
            <div>
              <p className="text-white font-semibold mb-3">How many fingers are you holding up?</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleCountChange(n)}
                    className={`flex-1 py-3 rounded-xl font-bold text-lg transition-colors ${
                      fingerCount === n ? 'bg-brand-500 text-white' : 'bg-white/10 text-gray-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Finger selector */}
            <div>
              <p className="text-white font-semibold mb-3">
                Which {fingerCount === 1 ? 'finger' : 'fingers'}?
                <span className="text-gray-400 font-normal text-sm ml-2">
                  {selectedFingers.length}/{fingerCount}
                </span>
              </p>
              <div className="flex gap-2">
                {FINGERS.map(({ name, label }) => {
                  const isSelected = selectedFingers.includes(name)
                  return (
                    <button
                      key={name}
                      onClick={() => toggleFinger(name)}
                      disabled={!isSelected && selectedFingers.length >= fingerCount}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : 'bg-white/10 text-gray-400 disabled:opacity-30'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={proceedToFriendPicker}
              disabled={selectedFingers.length !== fingerCount || loadingFriends}
              className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
            >
              {loadingFriends ? 'Loading…' : 'Choose recipient →'}
            </button>
          </div>
        </div>
      )}

      {/* Friend picker */}
      {step === 'pick-friend' && (
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 mt-4 bg-red-500/20 border border-red-500 text-red-300 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="text-5xl mb-3">👥</div>
              <p className="text-white font-bold">No friends yet</p>
              <p className="text-gray-500 text-sm mt-2">Add friends first to send them a challenge.</p>
              <button onClick={() => navigate('/friends')} className="mt-4 text-brand-400 text-sm font-semibold">
                Go to Friends →
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {friends.map(({ user }) => (
                <button
                  key={user.id}
                  onClick={() => sendChallenge({ friendshipId: '', user })}
                  disabled={sending}
                  className="w-full flex items-center gap-3 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 rounded-2xl px-4 py-3 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-brand-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">{user.username}</p>
                    <p className="text-gray-500 text-xs">{user.totalScore} pts</p>
                  </div>
                  <span className="text-brand-400 text-sm font-semibold">Send →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sending */}
      {step === 'sending' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-5xl mb-4 animate-bounce">📤</div>
          <p className="text-white font-bold">Sending challenge…</p>
        </div>
      )}

      {/* Sent confirmation */}
      {step === 'sent' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-7xl mb-4 animate-pop-in">✅</div>
          <p className="text-white font-black text-3xl mb-2">Challenge sent!</p>
          <p className="text-gray-400 text-sm mb-8">They'll have to guess your fingers.</p>
          <button
            onClick={() => {
              setStep('camera')
              setPreviewUrl(null)
              setSelectedFingers([])
              setFingerCount(1)
            }}
            className="bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 px-8 rounded-xl mb-3 transition-colors"
          >
            Send another
          </button>
          <button onClick={() => navigate('/')} className="text-gray-400 text-sm">
            Back to feed
          </button>
        </div>
      )}
    </div>
  )
}
