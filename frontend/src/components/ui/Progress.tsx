import { useEffect, useState } from 'react'
import type { DailyStreak } from '../../types'

const RING = { borderRadius: '50% 45% 55% 48% / 55% 50% 48% 52%' }

/** Tally marks, crossed in fives — how you'd count days in a notebook. */
export function Tally({ count, className = '' }: { count: number; className?: string }) {
  const groups = Array.from({ length: Math.ceil(count / 5) }, (_, i) => Math.min(5, count - i * 5))
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} aria-label={`${count}`}>
      {groups.map((n, i) => (
        <span key={i} className="relative inline-flex gap-[3px] h-4 items-stretch">
          {Array.from({ length: Math.min(n, 4) }, (_, j) => (
            <i key={j} className="w-[2px] bg-current rounded-full" style={{ transform: `rotate(${j % 2 ? 4 : -3}deg)` }} />
          ))}
          {n === 5 && <i className="absolute -left-1 -right-1 top-1/2 h-[2px] bg-current rounded-full -rotate-[28deg]" />}
        </span>
      ))}
    </span>
  )
}

/** Daily streak, circled in red pen. Dashed while today still needs a play. */
export function StreakChip({ daily, className = '' }: { daily: DailyStreak; className?: string }) {
  const atRisk = daily.days > 0 && !daily.todayDone
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-redpen border-2 border-redpen px-2.5 py-0.5 leading-none -rotate-2 ${atRisk ? 'border-dashed' : ''} ${className}`}
      style={RING}
      title={atRisk ? 'Play today to keep your streak' : undefined}
    >
      {daily.days === 0 ? (
        <span className="text-base">start a streak</span>
      ) : (
        <>
          {daily.days <= 10 ? <Tally count={daily.days} /> : null}
          <span className="text-base">{daily.days} day{daily.days > 1 ? 's' : ''}{atRisk ? '?' : ''}</span>
        </>
      )}
    </span>
  )
}

/** Level progress as a highlighter swipe. Pass `fromXp` to animate a gain. */
export function XpBar({ xp, levelStart, nextLevelAt, fromXp, className = '' }: {
  xp: number
  levelStart: number
  nextLevelAt: number
  fromXp?: number
  className?: string
}) {
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - levelStart) / (nextLevelAt - levelStart)) * 100))
  const [width, setWidth] = useState(pct(fromXp !== undefined && fromXp >= levelStart ? fromXp : fromXp !== undefined ? levelStart : xp))
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct(xp)), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp, levelStart, nextLevelAt])

  return (
    <span
      className={`relative block h-3.5 border-2 border-pen bg-white overflow-hidden ${className}`}
      style={{ borderRadius: '10px 4px 12px 5px' }}
      role="progressbar"
      aria-valuemin={levelStart}
      aria-valuemax={nextLevelAt}
      aria-valuenow={xp}
    >
      <span className="absolute inset-y-0 left-0 bg-hi transition-[width] duration-700 ease-out" style={{ width: `${width}%` }} />
    </span>
  )
}
