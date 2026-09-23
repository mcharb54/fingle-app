import { useState } from 'react'
import HandGlyph, { COUNT_FINGERS } from './ui/HandGlyph'

interface Props {
  onSelect: (count: number) => void
  disabled?: boolean
}

export default function CountPicker({ onSelect, disabled }: Props) {
  const [picked, setPicked] = useState<number | null>(null)

  return (
    <div className="w-full">
      <p className="text-center font-marker text-2xl mb-4">how many fingers??</p>
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setPicked(n)}
            disabled={disabled}
            aria-pressed={picked === n}
            aria-label={`${n} finger${n > 1 ? 's' : ''}`}
            className={`${n % 2 ? 'sketch' : 'sketch-alt'} w-14 h-[84px] flex flex-col items-center justify-between pt-2 pb-1 transition-transform active:scale-95 disabled:opacity-50 ${
              picked === n ? '!bg-hi -translate-y-1' : ''
            }`}
          >
            <HandGlyph raised={COUNT_FINGERS[n - 1]} fill={picked === n ? '#F3FF4F' : '#fff'} className="w-8 text-pen" />
            <span className="text-2xl leading-none">{n}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => picked && onSelect(picked)}
        disabled={!picked || disabled}
        className="btn-pen w-full mt-5"
      >
        {disabled ? 'checking…' : "that's my guess"}
      </button>
    </div>
  )
}
