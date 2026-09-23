import { useEffect } from 'react'
import type { FingerName, GuessProgress } from '../types'
import HandGlyph from './ui/HandGlyph'
import { Tally, XpBar } from './ui/Progress'
import { playReveal } from '../lib/sound'

interface Props {
  points: number
  isCountCorrect: boolean
  isFingersCorrect: boolean
  correctCount: number
  correctFingers: string[]
  quickDraw?: boolean
  /** Present right after guessing; absent when revisiting an old guess */
  progress?: GuessProgress
}

/** The reveal: score circled in red pen, what you got right, and the real answer. */
export default function PointsAnimation({ points, isCountCorrect, isFingersCorrect, correctCount, correctFingers, quickDraw, progress }: Props) {
  const perfect = isCountCorrect && isFingersCorrect

  useEffect(() => {
    // Android buzz; iOS Safari has no vibration API and simply ignores this
    if (!progress) return
    navigator.vibrate?.(points > 0 ? (perfect ? [30, 60, 30, 60, 90] : [40]) : [120])
    playReveal(perfect ? 'perfect' : points > 0 ? 'score' : 'miss')
    if (progress.newBadges.length > 0) {
      const t = setTimeout(() => playReveal('badge'), 900)
      return () => clearTimeout(t)
    }
  }, [points, perfect, progress])

  const leveledUp = progress ? progress.xpBefore < progress.levelStart : false

  const headline = perfect ? 'nailed it!' : isCountCorrect ? 'right count!' : isFingersCorrect ? 'right fingers!' : 'nope!'

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-3">
        <span className="relative inline-block font-marker text-5xl text-redpen px-5 py-2 animate-pop-in">
          +{points}
          <svg viewBox="0 0 120 60" preserveAspectRatio="none" className="absolute -inset-x-3 -inset-y-1 w-[calc(100%+24px)] h-[calc(100%+8px)] overflow-visible" aria-hidden="true">
            <path
              d="M18 8 C 60 -4, 112 6, 112 30 C 112 54, 40 60, 12 46 C -4 36, 6 12, 34 6"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray="340" className="animate-draw"
            />
          </svg>
        </span>
        <span className="font-marker text-3xl -rotate-3">{headline}</span>
      </div>

      <div className="flex gap-4 mt-3 text-lg">
        <span>count <b className={`font-normal ${isCountCorrect ? 'text-redpen' : 'text-pen-faint line-through'}`}>{isCountCorrect ? '✓' : '✗'}</b></span>
        <span>fingers <b className={`font-normal ${isFingersCorrect ? 'text-redpen' : 'text-pen-faint line-through'}`}>{isFingersCorrect ? '✓' : '✗'}</b></span>
        {quickDraw && <span className="hi">quick draw +5</span>}
      </div>

      {!perfect && (
        <div className="flex items-center gap-3 mt-3 text-lg text-pen-soft">
          <span>the answer:</span>
          <HandGlyph raised={correctFingers as FingerName[]} className="w-9 text-pen" />
          <span>
            {correctCount === 5 ? 'all 5' : `${correctCount} · ${correctFingers.join(', ')}`}
          </span>
        </div>
      )}

      {progress && (
        <div className="w-full max-w-xs mt-5 flex flex-col gap-2">
          <div className="flex items-center gap-2.5 text-lg">
            <span className="whitespace-nowrap">
              {leveledUp ? <span className="font-marker text-redpen animate-pop-in inline-block">level up!</span> : 'lv'} <span className="text-2xl">{progress.level}</span>
            </span>
            <XpBar xp={progress.xp} fromXp={progress.xpBefore} levelStart={progress.levelStart} nextLevelAt={progress.nextLevelAt} className="flex-1" />
          </div>
          <div className="flex justify-center gap-5 text-lg">
            {progress.hotStreak >= 2 && <span>hot streak <span className="font-marker text-redpen">{progress.hotStreak}</span></span>}
            {progress.daily.days > 0 && (
              <span className="inline-flex items-center gap-2">
                {progress.daily.days <= 10 && <Tally count={progress.daily.days} className="text-pen" />}
                {progress.daily.days} day{progress.daily.days > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {progress.newBadges.map((b, i) => (
            <div
              key={b.id}
              className="sticky-note flex items-center gap-3 animate-pop-in text-left"
              style={{ animationDelay: `${0.8 + i * 0.2}s`, transform: `rotate(${i % 2 ? 1.2 : -1.2}deg)` }}
            >
              <span className="font-marker text-redpen text-sm leading-tight">new<br />badge</span>
              <div>
                <p className="font-marker text-lg leading-tight">{b.name}</p>
                <p className="text-base text-pen-soft leading-tight">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
