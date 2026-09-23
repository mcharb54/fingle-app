import type { FingerName } from '../../types'

// Finger columns in the 100×130 drawing, left to right after the thumb
const FINGERS: { name: Exclude<FingerName, 'thumb'>; x: number; top: number }[] = [
  { name: 'index', x: 27, top: 18 },
  { name: 'middle', x: 40, top: 10 },
  { name: 'ring', x: 53, top: 16 },
  { name: 'pinky', x: 66, top: 30 },
]

// First n fingers up — how people count on one hand
export const COUNT_FINGERS: FingerName[][] = [
  ['index'],
  ['index', 'middle'],
  ['index', 'middle', 'ring'],
  ['index', 'middle', 'ring', 'pinky'],
  ['thumb', 'index', 'middle', 'ring', 'pinky'],
]

interface Props {
  raised: FingerName[]
  className?: string
  /** Fill for the hand; defaults to white paper */
  fill?: string
  /** Pen-wobble outline (off for tiny sizes where it smears) */
  wobble?: boolean
}

/** A drawn hand with the given fingers up and the rest curled into knuckles. */
export default function HandGlyph({ raised, className = '', fill = '#fff', wobble = true }: Props) {
  const up = new Set(raised)
  return (
    <svg
      viewBox="0 0 100 130"
      className={className}
      aria-hidden="true"
      fill={fill}
      stroke="currentColor"
      strokeWidth={3.5}
      style={wobble ? { filter: 'url(#pen-wobble)', overflow: 'visible' } : { overflow: 'visible' }}
    >
      {up.has('thumb') && <rect x="9" y="56" width="12" height="38" rx="6" transform="rotate(-34 15 94)" />}
      {FINGERS.map(({ name, x, top }) => {
        const y = up.has(name) ? top : 50
        return <rect key={name} x={x} y={y} width="12" height={76 - y} rx="6" />
      })}
      <rect x="24" y="62" width="56" height="52" rx="17" />
      {!up.has('thumb') && <rect x="20" y="76" width="30" height="12" rx="6" />}
    </svg>
  )
}

/** Shared SVG filters — render once near the app root. */
export function PenDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <filter id="pen-wobble">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" />
        <feDisplacementMap in="SourceGraphic" scale="3" />
      </filter>
    </svg>
  )
}
