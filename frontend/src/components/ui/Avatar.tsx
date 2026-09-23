const COLORS = ['bg-marker-yellow', 'bg-marker-pink', 'bg-marker-green', 'bg-marker-blue', 'bg-marker-orange']

// Same friend, same highlighter color, everywhere
function colorFor(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

const SIZES = {
  sm: 'w-7 h-7 text-sm',
  md: 'w-10 h-10 text-lg',
  lg: 'w-24 h-24 text-5xl',
}

export default function Avatar({ name, size = 'md' }: { name: string; size?: keyof typeof SIZES }) {
  return (
    <span
      className={`${SIZES[size]} ${colorFor(name)} flex-shrink-0 inline-flex items-center justify-center rounded-full border-2 border-pen font-marker text-pen leading-none`}
      aria-hidden="true"
    >
      {name[0]?.toUpperCase()}
    </span>
  )
}
