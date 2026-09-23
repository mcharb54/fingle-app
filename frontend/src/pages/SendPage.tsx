import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { challengesApi, friendsApi } from '../api'
import type { Badge, FingerName, FriendEntry } from '../types'
import CameraCapture from '../components/CameraCapture'
import HandGlyph, { COUNT_FINGERS } from '../components/ui/HandGlyph'
import Avatar from '../components/ui/Avatar'
import Icon from '../components/ui/Icon'

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
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [newBadges, setNewBadges] = useState<Badge[]>([])
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
      setSelectedFriendIds([])
      setStep('pick-friend')
    } catch {
      setError('Failed to load friends')
    } finally {
      setLoadingFriends(false)
    }
  }

  function toggleFriendSelection(id: string) {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    )
  }

  function toggleSelectAll() {
    const allIds = friends.map(({ user }) => user.id)
    setSelectedFriendIds((prev) => (prev.length === allIds.length ? [] : allIds))
  }

  async function sendChallenges() {
    if (!capturedBlobRef.current || selectedFriendIds.length === 0) return
    setSending(true)
    setStep('sending')
    setError(null)
    try {
      const fd = new FormData()
      fd.append('photo', capturedBlobRef.current, 'challenge.jpg')
      fd.append('receiverIds', JSON.stringify(selectedFriendIds))
      fd.append('fingerCount', String(fingerCount))
      fd.append('whichFingers', JSON.stringify(selectedFingers))
      const { challenges, newBadges } = await challengesApi.send(fd)
      setSentCount(challenges.length)
      setNewBadges(newBadges ?? [])
      setStep('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send challenge')
      setStep('pick-friend')
    } finally {
      setSending(false)
    }
  }

  const allSelected = friends.length > 0 && selectedFriendIds.length === friends.length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center px-3 py-2 safe-top">
        {step !== 'camera' && step !== 'sent' ? (
          <button onClick={() => setStep(step === 'pick-friend' ? 'tag' : 'camera')} className="p-2" aria-label="Back">
            <Icon name="back" />
          </button>
        ) : (
          <button onClick={() => navigate('/')} className="p-2" aria-label="Back to feed">
            <Icon name="back" />
          </button>
        )}
        <h2 className="flex-1 text-center font-marker text-2xl mr-10">
          {step === 'camera' && 'new fingle'}
          {step === 'tag' && 'what are you holding up?'}
          {step === 'pick-friend' && 'who gets it?'}
          {step === 'sending' && 'sending…'}
          {step === 'sent' && 'sent!'}
        </h2>
      </div>

      {/* Camera */}
      {step === 'camera' && (
        <div className="flex-1 relative mx-4 mb-4 overflow-hidden border-2 border-pen" style={{ borderRadius: '18px 6px 20px 8px' }}>
          <CameraCapture onCapture={handleCapture} />
        </div>
      )}

      {/* Tag fingers */}
      {step === 'tag' && previewUrl && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex items-center justify-center px-8 py-3">
            <div className="polaroid max-h-full" style={{ transform: 'rotate(1deg)' }}>
              <span className="tape" aria-hidden="true" />
              <img src={previewUrl} alt="Your fingle" className="max-h-[32vh] w-auto object-contain" />
            </div>
          </div>

          <div className="graph border-t-2 border-pen rounded-t-3xl px-5 pt-5 pb-6 space-y-5">
            <div>
              <p className="text-lg mb-2.5">how many are up?</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleCountChange(n)}
                    aria-pressed={fingerCount === n}
                    aria-label={`${n} finger${n > 1 ? 's' : ''}`}
                    className={`${n % 2 ? 'sketch' : 'sketch-alt'} w-14 h-[76px] flex flex-col items-center justify-between pt-1.5 pb-1 transition-transform active:scale-95 ${
                      fingerCount === n ? '!bg-hi -translate-y-1' : ''
                    }`}
                  >
                    <HandGlyph raised={COUNT_FINGERS[n - 1]} fill={fingerCount === n ? '#F3FF4F' : '#fff'} className="w-7 text-pen" />
                    <span className="text-xl leading-none">{n}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-lg mb-2.5">
                which {fingerCount === 1 ? 'one' : 'ones'}?
                <span className="text-pen-soft ml-2">{selectedFingers.length}/{fingerCount}</span>
              </p>
              <div className="flex gap-2 justify-center">
                {FINGERS.map(({ name, label }, i) => {
                  const isSelected = selectedFingers.includes(name)
                  return (
                    <button
                      key={name}
                      onClick={() => toggleFinger(name)}
                      disabled={!isSelected && selectedFingers.length >= fingerCount}
                      aria-pressed={isSelected}
                      className={`${i % 2 ? 'sketch-alt' : 'sketch'} w-14 h-[76px] flex flex-col items-center justify-between pt-1.5 pb-1 transition-transform active:scale-95 disabled:opacity-35 ${
                        isSelected ? '!bg-hi -translate-y-1' : ''
                      }`}
                    >
                      <HandGlyph raised={[name]} fill={isSelected ? '#F3FF4F' : '#fff'} className="w-7 text-pen" />
                      <span className="text-sm leading-none lowercase">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={proceedToFriendPicker}
              disabled={selectedFingers.length !== fingerCount || loadingFriends}
              className="btn-pen w-full"
            >
              {loadingFriends ? 'hang on…' : 'pick who gets it'}
            </button>
          </div>
        </div>
      )}

      {/* Friend picker — multi-select */}
      {step === 'pick-friend' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {error && <div className="note-error mx-5 mt-3">{error}</div>}
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <HandGlyph raised={['index']} className="w-20 text-pen rotate-6" />
              <p className="font-marker text-2xl mt-4">no friends yet</p>
              <p className="text-lg text-pen-soft mt-1">add some first, then send them one</p>
              <button onClick={() => navigate('/friends')} className="btn-outline mt-5">find friends</button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-2 divide-y-2 divide-dashed divide-pen-faint/60">
                <FriendRow
                  label="everyone"
                  sub={`${friends.length} friends`}
                  checked={allSelected}
                  onClick={toggleSelectAll}
                  avatar={
                    <span className="w-10 h-10 flex-shrink-0 rounded-full border-2 border-pen bg-white flex items-center justify-center">
                      <Icon name="users" className="w-5 h-5" />
                    </span>
                  }
                />
                {friends.map(({ user }) => (
                  <FriendRow
                    key={user.id}
                    label={user.username}
                    sub={`${user.totalScore} pts`}
                    checked={selectedFriendIds.includes(user.id)}
                    onClick={() => toggleFriendSelection(user.id)}
                    avatar={<Avatar name={user.username} />}
                  />
                ))}
              </div>

              <div className="px-5 pt-3 pb-5 border-t-2 border-dashed border-pen-faint">
                <button onClick={sendChallenges} disabled={selectedFriendIds.length === 0 || sending} className="btn-pen w-full">
                  <Icon name="plane" className="w-5 h-5" />
                  {selectedFriendIds.length === 0
                    ? 'pick at least one'
                    : `send to ${selectedFriendIds.length} friend${selectedFriendIds.length > 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sending */}
      {step === 'sending' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <HandGlyph raised={COUNT_FINGERS[fingerCount - 1]} className="w-20 text-pen animate-wiggle" />
          <p className="font-marker text-2xl mt-5">sending…</p>
        </div>
      )}

      {/* Sent confirmation */}
      {step === 'sent' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <HandGlyph raised={COUNT_FINGERS[fingerCount - 1]} className="w-24 text-pen animate-pop-in -rotate-6" />
          <p className="font-marker text-4xl mt-5">
            <span className="hi">{sentCount > 1 ? `${sentCount} friends` : 'off it goes'}</span>
          </p>
          <p className="text-lg text-pen-soft mt-2">now they have to guess your fingers</p>
          <p className="text-lg mt-1 mb-6">stump them for up to <span className="text-redpen">+10</span>{sentCount > 1 ? ' each' : ''}</p>
          {newBadges.map((b) => (
            <div key={b.id} className="sticky-note flex items-center gap-3 animate-pop-in text-left mb-6 max-w-xs">
              <span className="font-marker text-redpen text-sm leading-tight">new<br />badge</span>
              <div>
                <p className="font-marker text-lg leading-tight">{b.name}</p>
                <p className="text-base text-pen-soft leading-tight">{b.description}</p>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setStep('camera')
              setPreviewUrl(null)
              setSelectedFingers([])
              setFingerCount(1)
              setSelectedFriendIds([])
            }}
            className="btn-pen px-8"
          >
            send another
          </button>
          <button onClick={() => navigate('/')} className="link text-lg mt-5">
            back to the feed
          </button>
        </div>
      )}
    </div>
  )
}

function FriendRow({ label, sub, checked, onClick, avatar }: {
  label: string
  sub: string
  checked: boolean
  onClick: () => void
  avatar: React.ReactNode
}) {
  return (
    <button onClick={onClick} role="checkbox" aria-checked={checked} className="w-full flex items-center gap-3 py-3 text-left">
      {avatar}
      <div className="flex-1 min-w-0">
        <p className={`text-xl leading-tight truncate ${checked ? '' : ''}`}>{checked ? <span className="hi">{label}</span> : label}</p>
        <p className="text-sm text-pen-soft">{sub}</p>
      </div>
      <span
        className={`w-7 h-7 flex-shrink-0 border-2 border-pen flex items-center justify-center ${checked ? 'bg-white text-redpen' : 'bg-white/70'}`}
        style={{ borderRadius: '6px 3px 7px 2px' }}
      >
        {checked && <Icon name="check" className="w-6 h-6 -rotate-6" />}
      </span>
    </button>
  )
}
