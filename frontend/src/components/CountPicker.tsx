interface Props {
  onSelect: (count: number) => void
  disabled?: boolean
}

const EMOJI = ['☝️', '✌️', '🤟', '🖖', '🖐️']

export default function CountPicker({ onSelect, disabled }: Props) {
  return (
    <div className="w-full">
      <p className="text-center text-white font-bold text-lg mb-4">How many fingers?</p>
      <div className="flex gap-3 justify-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onSelect(n)}
            disabled={disabled}
            className="flex flex-col items-center gap-1 bg-white/10 active:bg-brand-500 hover:bg-white/20 disabled:opacity-50 rounded-2xl w-14 h-20 justify-center transition-colors"
          >
            <span className="text-2xl">{EMOJI[n - 1]}</span>
            <span className="text-white font-black text-xl">{n}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
