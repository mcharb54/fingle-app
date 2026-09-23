/**
 * Every tunable game rule lives here.
 */

export const FINGER_NAMES = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const
export type FingerName = (typeof FINGER_NAMES)[number]

export const QUICK_DRAW_WINDOW_MS = 60 * 60 * 1000
export const QUICK_DRAW_BONUS = 5

export function scoreGuess(
  correctCount: number,
  correctFingers: FingerName[],
  countGuess: number,
  fingersGuess: FingerName[],
): { points: number; isCountCorrect: boolean; isFingersCorrect: boolean } {
  const isCountCorrect = countGuess === correctCount

  const correctSet = new Set(correctFingers)
  const guessSet = new Set(fingersGuess)
  const isFingersCorrect =
    correctSet.size === guessSet.size &&
    [...correctSet].every((f) => guessSet.has(f))

  let points = 0
  if (isCountCorrect && isFingersCorrect) points = 30
  else if (isCountCorrect) points = 10
  else if (isFingersCorrect && correctCount !== 5) points = 5

  return { points, isCountCorrect, isFingersCorrect }
}

// A guess that scores inside the window earns the bonus; a zero stays a zero
export function isQuickDraw(basePoints: number, sentAt: Date, guessedAt: Date): boolean {
  return basePoints > 0 && guessedAt.getTime() - sentAt.getTime() <= QUICK_DRAW_WINDOW_MS
}

// The sender is rewarded for fooling a friend: fully stumped beats half stumped
export function stumperPoints(basePoints: number): number {
  if (basePoints === 0) return 10
  if (basePoints < 30) return 5
  return 0
}

// Each level costs 25 more than the last: 0, 50, 125, 225, 350, 500, ...
export function levelStart(level: number): number {
  const n = level - 1
  return 50 * n + (25 * n * (n - 1)) / 2
}

export function levelFor(xp: number): { level: number; levelStart: number; nextLevelAt: number } {
  let level = 1
  while (levelStart(level + 1) <= xp) level++
  return { level, levelStart: levelStart(level), nextLevelAt: levelStart(level + 1) }
}
