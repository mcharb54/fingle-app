import type { FingerName } from '../types'
import HandGlyph from './ui/HandGlyph'

interface Props {
  count: number
  freeMode?: boolean
  actualCount?: number
  selected: FingerName[]
  onToggle: (finger: FingerName) => void
  onSubmit: () => void
  disabled?: boolean
}

const FINGERS: { name: FingerName; label: string }[] = [
  { name: 'thumb', label: 'thumb' },
  { name: 'index', label: 'index' },
  { name: 'middle', label: 'middle' },
  { name: 'ring', label: 'ring' },
  { name: 'pinky', label: 'pinky' },
]

export default function FingerPicker({ count, freeMode = false, actualCount, selected, onToggle, onSubmit, disabled }: Props) {
  const target = freeMode ? actualCount : count
  const canSubmit = target !== undefined ? selected.length === target : selected.length >= 1

  return (
    <div className="w-full animate-slide-up">
      <p className="text-center font-marker text-2xl leading-tight">
        {freeMode
          ? actualCount !== undefined
            ? <>not quite, it was <span className="text-redpen">{actualCount}</span></>
            : 'not quite!'
          : <span className="hi">yes! {count} it is</span>}
      </p>
      <p className="text-center text-lg text-pen-soft mt-1 mb-4">
        {freeMode
          ? `which ${actualCount === 1 ? 'finger was it' : 'fingers were they'}? right ones still get you 5`
          : `now which ${count === 1 ? 'finger' : `${count} fingers`}? nail it for 30`}
      </p>
      <div className="flex gap-2 justify-center mb-5">
        {FINGERS.map(({ name, label }, i) => {
          const isSelected = selected.includes(name)
          const maxReached = target !== undefined && !isSelected && selected.length >= target
          return (
            <button
              key={name}
              onClick={() => onToggle(name)}
              disabled={disabled || maxReached}
              aria-pressed={isSelected}
              className={`${i % 2 ? 'sketch-alt' : 'sketch'} w-14 h-[84px] flex flex-col items-center justify-between pt-2 pb-1 transition-transform active:scale-95 disabled:opacity-35 ${
                isSelected ? '!bg-hi -translate-y-1' : ''
              }`}
            >
              <HandGlyph raised={[name]} fill={isSelected ? '#F3FF4F' : '#fff'} className="w-8 text-pen" />
              <span className="text-sm leading-none">{label}</span>
            </button>
          )
        })}
      </div>
      <button onClick={onSubmit} disabled={!canSubmit || disabled} className="btn-pen w-full">
        {disabled ? 'checking…' : `that's my guess (${selected.length}/${target ?? '?'})`}
      </button>
    </div>
  )
}
