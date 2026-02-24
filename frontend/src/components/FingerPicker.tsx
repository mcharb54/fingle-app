import type { FingerName } from '../types'

interface Props {
  count: number
  selected: FingerName[]
  onToggle: (finger: FingerName) => void
  onSubmit: () => void
  disabled?: boolean
}

const FINGERS: { name: FingerName; label: string; emoji: string }[] = [
  { name: 'thumb', label: 'Thumb', emoji: '👍' },
  { name: 'index', label: 'Index', emoji: '☝️' },
  { name: 'middle', label: 'Middle', emoji: '🖕' },
  { name: 'ring', label: 'Ring', emoji: '💍' },
  { name: 'pinky', label: 'Pinky', emoji: '🤙' },
]

export default function FingerPicker({ count, selected, onToggle, onSubmit, disabled }: Props) {
  const canSubmit = selected.length === count

  return (
    <div className="w-full animate-slide-up">
      <p className="text-center text-white font-bold text-lg mb-1">
        Correct! Now which {count === 1 ? 'finger' : `${count} fingers`}?
      </p>
      <p className="text-center text-gray-400 text-sm mb-5">
        Select {count} — bonus points!
      </p>
      <div className="flex gap-2 justify-center mb-6">
        {FINGERS.map(({ name, label, emoji }) => {
          const isSelected = selected.includes(name)
          return (
            <button
              key={name}
              onClick={() => onToggle(name)}
              disabled={disabled || (!isSelected && selected.length >= count)}
              className={`flex flex-col items-center gap-1 rounded-2xl w-14 h-20 justify-center transition-colors ${
                isSelected
                  ? 'bg-brand-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20 disabled:opacity-30'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-semibold">{label}</span>
            </button>
          )
        })}
      </div>
      <button
        onClick={onSubmit}
        disabled={!canSubmit || disabled}
        className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
      >
        Submit fingers ({selected.length}/{count})
      </button>
    </div>
  )
}
