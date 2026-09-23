import { FormEvent, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi, pushApi } from '../api'
import { usePushNotifications } from '../hooks/usePushNotifications'
import Avatar from '../components/ui/Avatar'
import Icon from '../components/ui/Icon'
import { StreakChip, XpBar } from '../components/ui/Progress'
import { useStats } from '../hooks/useStats'
import { setSoundsEnabled, soundsEnabled } from '../lib/sound'

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth()
  const { isSupported, permission, isSubscribed, enableNotifications } = usePushNotifications()
  const [testPushLoading, setTestPushLoading] = useState(false)
  const [testPushMsg, setTestPushMsg] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  const { stats, badges, headToHead } = useStats()
  const [sounds, setSounds] = useState(soundsEnabled)

  const [minimizePhotos, setMinimizePhotos] = useState(
    () => localStorage.getItem('fingle_minimize_photos') === 'true',
  )

  const [showChangeUsername, setShowChangeUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [unLoading, setUnLoading] = useState(false)
  const [unError, setUnError] = useState('')
  const [unSuccess, setUnSuccess] = useState('')

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  if (!user) return null

  async function handleResendVerification() {
    setResendLoading(true)
    setResendMsg('')
    try {
      await authApi.resendVerification()
      setResendMsg('Verification email sent!')
    } catch (err) {
      setResendMsg(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setResendLoading(false)
    }
  }

  async function handleChangeUsername(e: FormEvent) {
    e.preventDefault()
    setUnError('')
    setUnSuccess('')
    setUnLoading(true)
    try {
      await authApi.changeUsername(newUsername)
      await refreshUser()
      setUnSuccess('Username updated!')
      setNewUsername('')
      setShowChangeUsername(false)
    } catch (err) {
      setUnError(err instanceof Error ? err.message : 'Failed to update username')
    } finally {
      setUnLoading(false)
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    setPwLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setPwSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setShowChangePassword(false)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="quiet min-h-full">
      <div className="sticky top-0 z-10 paper-bar safe-top px-4 pt-3 pb-2 border-b-2 border-dashed border-pen-faint">
        <h1 className="page-title"><span className="hi">me</span></h1>
      </div>

      <div className="px-5 py-6 flex flex-col gap-4">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <Avatar name={user.username} size="lg" />
          <div className="min-w-0">
            <h2 className="font-marker text-3xl leading-tight truncate">{user.username}</h2>
            <p className="text-pen-soft truncate">{user.email}</p>
          </div>
        </div>

        {/* Email verification */}
        {!user.emailVerified && (
          <div className="sticky-note">
            <p className="font-bold">Verify your email</p>
            <p className="text-sm text-pen-soft mt-0.5 mb-2">Check your inbox for a verification link. Didn't get it?</p>
            {resendMsg ? (
              <p className="text-sm font-bold">{resendMsg}</p>
            ) : (
              <button onClick={handleResendVerification} disabled={resendLoading} className="link text-sm font-bold disabled:opacity-50">
                {resendLoading ? 'Sending…' : 'Resend verification email'}
              </button>
            )}
          </div>
        )}

        {/* Progress */}
        <section className="sketch p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="margin-label">Level</p>
              <p className="leading-none mt-1">
                <span className="font-bold text-4xl tabular-nums">{stats?.level ?? '–'}</span>{' '}
                <span className="font-bold text-base text-pen-soft">{stats?.title}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="margin-label">Total score</p>
              <p className="font-bold text-3xl text-redpen tabular-nums leading-none mt-1">{user.totalScore}</p>
            </div>
          </div>
          {stats && (
            <>
              <XpBar xp={stats.xp} levelStart={stats.levelStart} nextLevelAt={stats.nextLevelAt} className="mt-4" />
              <p className="text-sm text-pen-soft mt-1.5">{stats.nextLevelAt - stats.xp} points to level {stats.level + 1}</p>
              <div className="flex items-center gap-3 mt-4">
                <StreakChip daily={stats.daily} />
                <span className="text-sm text-pen-soft">
                  {stats.daily.days > 0 && !stats.daily.todayDone
                    ? 'Guess or send today to keep it going'
                    : stats.daily.freezeUsedThisWeek
                      ? 'Free miss used this week'
                      : 'One free miss per week'}
                </span>
              </div>
              <dl className="grid grid-cols-3 gap-3 mt-5 text-center">
                <Stat label="Perfect" value={stats.guesses ? `${Math.round((stats.perfects / stats.guesses) * 100)}%` : '–'} />
                <Stat label="Right count" value={stats.guesses ? `${Math.round((stats.countCorrect / stats.guesses) * 100)}%` : '–'} />
                <Stat label="Hot streak" value={`${stats.hotStreak}`} sub={`best ${stats.bestHotStreak}`} />
                <Stat label="Guessed" value={`${stats.guesses}`} />
                <Stat label="Stumped" value={`${stats.stumps}`} sub="friends" />
                <Stat label="Quick draws" value={`${stats.quickDraws}`} />
              </dl>
            </>
          )}
        </section>

        {/* Badges */}
        {badges.length > 0 && (
          <section className="sketch p-5">
            <p className="margin-label mb-3">
              Badges <span className="normal-case tracking-normal font-normal">({badges.filter((b) => b.earnedAt).length} of {badges.length})</span>
            </p>
            <ul className="grid grid-cols-2 gap-2.5">
              {badges.map((b) => (
                <li
                  key={b.id}
                  className={`px-3 py-2 border-2 rounded-lg ${b.earnedAt ? 'border-pen bg-hi/60' : 'border-dashed border-pen-faint text-pen-faint'}`}
                >
                  <p className="font-bold text-sm leading-tight">{b.name}</p>
                  <p className="text-xs leading-snug mt-0.5 opacity-80">{b.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Head-to-head */}
        {headToHead.some((h) => h.theirFingles + h.yourFingles > 0) && (
          <section className="sketch p-5">
            <p className="margin-label mb-2">Head-to-head</p>
            <ul className="divide-y divide-dashed divide-pen-faint">
              {headToHead
                .filter((h) => h.theirFingles + h.yourFingles > 0)
                .map((h) => (
                  <li key={h.friend.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={h.friend.username} size="sm" />
                    <span className="font-bold flex-1 min-w-0 truncate">{h.friend.username}</span>
                    <span className="text-sm text-right leading-tight">
                      you cracked <b className="tabular-nums">{h.youCracked}/{h.theirFingles}</b>
                      <br />
                      <span className="text-pen-soft">they cracked <b className="tabular-nums">{h.theyCracked}/{h.yourFingles}</b></span>
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* Scoring legend */}
        <section className="sketch p-5">
          <p className="margin-label mb-3">How scoring works</p>
          <dl className="divide-y divide-dashed divide-pen-faint">
            {[
              ['Right count and right fingers', '+30'],
              ['Right count only', '+10'],
              ['Wrong count, right fingers', '+5'],
              ['Wrong count, wrong fingers', '0'],
              ['Scoring guess within an hour of it arriving', '+5 bonus'],
              ['You sent it and a friend scored 0', '+10 for you'],
              ['You sent it and a friend half cracked it', '+5 for you'],
            ].map(([label, pts]) => (
              <div key={label} className="flex items-center justify-between py-2">
                <dt>{label}</dt>
                <dd className="font-bold tabular-nums">{pts}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Preferences */}
        <section className="sketch p-5">
          <p className="margin-label mb-3">Preferences</p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold">Minimize photos by default</p>
              <p className="text-pen-soft text-sm mt-0.5">Collapse photos in the inbox and sent feeds</p>
            </div>
            <button
              onClick={() => {
                const next = !minimizePhotos
                setMinimizePhotos(next)
                localStorage.setItem('fingle_minimize_photos', String(next))
              }}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-pen transition-colors duration-200 ${
                minimizePhotos ? 'bg-pen' : 'bg-white'
              }`}
              role="switch"
              aria-checked={minimizePhotos}
              aria-label="Minimize photos by default"
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full border-2 border-pen transition-transform duration-200 ${
                  minimizePhotos ? 'translate-x-5 bg-hi' : 'translate-x-0 bg-white'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Sounds */}
        <section className="sketch p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-bold">Reveal sounds</p>
              <p className="text-pen-soft text-sm mt-0.5">Play a sound when your guess is revealed</p>
            </div>
            <button
              onClick={() => {
                setSounds(!sounds)
                setSoundsEnabled(!sounds)
              }}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-pen transition-colors duration-200 ${sounds ? 'bg-pen' : 'bg-white'}`}
              role="switch"
              aria-checked={sounds}
              aria-label="Reveal sounds"
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full border-2 border-pen transition-transform duration-200 ${sounds ? 'translate-x-5 bg-hi' : 'translate-x-0 bg-white'}`} />
            </button>
          </div>
        </section>

        {/* Notifications */}
        {isSupported && (
          <section className="sketch p-5">
            <p className="margin-label mb-3">Notifications</p>
            <div className="flex items-center justify-between">
              <p>
                Status:{' '}
                <span className={`font-bold ${isSubscribed ? 'text-pen' : 'text-redpen'}`}>
                  {isSubscribed ? 'On' : permission === 'denied' ? 'Blocked in browser settings' : 'Off'}
                </span>
              </p>
              {!isSubscribed && permission !== 'denied' && (
                <button onClick={enableNotifications} className="link font-bold">Turn on</button>
              )}
            </div>
            {isSubscribed && (
              <div className="mt-3">
                <button
                  onClick={async () => {
                    setTestPushLoading(true)
                    setTestPushMsg('')
                    try {
                      await pushApi.testPush()
                      setTestPushMsg('Test notification sent')
                    } catch {
                      setTestPushMsg('Could not send a test notification')
                    } finally {
                      setTestPushLoading(false)
                    }
                  }}
                  disabled={testPushLoading}
                  className="btn-outline w-full py-2.5"
                >
                  <Icon name="bell" className="w-5 h-5" />
                  {testPushLoading ? 'Sending…' : 'Send a test notification'}
                </button>
                {testPushMsg && <p className="text-pen-soft text-sm mt-2 text-center">{testPushMsg}</p>}
              </div>
            )}
          </section>
        )}

        {/* Change username */}
        <section className="sketch overflow-hidden">
          <button
            onClick={() => {
              setShowChangeUsername((v) => !v)
              setUnError('')
              setUnSuccess('')
            }}
            className="w-full flex items-center justify-between px-5 py-4 text-left font-bold"
            aria-expanded={showChangeUsername}
          >
            Change username
            <Icon name="chevron" className={`w-5 h-5 transition-transform ${showChangeUsername ? 'rotate-180' : ''}`} />
          </button>
          {showChangeUsername && (
            <form onSubmit={handleChangeUsername} className="px-5 pb-5 space-y-3">
              {unError && <div className="note-error">{unError}</div>}
              {unSuccess && <div className="note-ok">{unSuccess}</div>}
              <input
                id="new-username"
                type="text"
                placeholder={`New username (now: ${user.username})`}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                minLength={2}
                maxLength={30}
                className="field"
              />
              <button type="submit" disabled={unLoading} className="btn-pen w-full">
                {unLoading ? 'Saving…' : 'Save username'}
              </button>
            </form>
          )}
        </section>

        {/* Change password */}
        <section className="sketch overflow-hidden">
          <button
            onClick={() => {
              setShowChangePassword((v) => !v)
              setPwError('')
              setPwSuccess('')
            }}
            className="w-full flex items-center justify-between px-5 py-4 text-left font-bold"
            aria-expanded={showChangePassword}
          >
            Change password
            <Icon name="chevron" className={`w-5 h-5 transition-transform ${showChangePassword ? 'rotate-180' : ''}`} />
          </button>
          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="px-5 pb-5 space-y-3">
              {pwError && <div className="note-error">{pwError}</div>}
              {pwSuccess && <div className="note-ok">{pwSuccess}</div>}
              <input
                id="current-password"
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="field"
              />
              <input
                id="new-password"
                type="password"
                placeholder="New password (at least 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="field"
              />
              <button type="submit" disabled={pwLoading} className="btn-pen w-full">
                {pwLoading ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          )}
        </section>

        {user.isAdmin && (
          <a href="/admin" className="btn-outline w-full justify-between">
            <span>Admin panel</span>
            <Icon name="back" className="w-5 h-5 rotate-180" />
          </a>
        )}

        <button onClick={logout} className="btn-red w-full">Sign out</button>

        <p className="mt-2 text-center text-pen-faint text-xs">
          <a
            href="https://www.flaticon.com/free-icons/hand-up"
            title="hand up icons"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-pen-soft"
          >
            Hand up icons created by Park Mi Kyoung – Flaticon
          </a>
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col-reverse justify-end">
      <dt className="text-xs text-pen-soft mt-1 leading-tight">
        {label}
        {sub && <><br />{sub}</>}
      </dt>
      <dd className="font-bold text-2xl tabular-nums leading-none">{value}</dd>
    </div>
  )
}
