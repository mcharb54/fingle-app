import { useState } from 'react'

const DISMISSED_KEY = 'fingle_push_dismissed'

export default function NotificationPrompt({ onEnable }: { onEnable: () => void }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true',
  )

  if (dismissed) return null

  return (
    <div className="mx-4 mt-3 flex items-center gap-3 bg-zinc-900 rounded-2xl p-4">
      <span className="text-2xl flex-shrink-0">🔔</span>
      <p className="text-white text-sm flex-1">
        Enable notifications to know when friends challenge you
      </p>
      <button
        onClick={onEnable}
        className="flex-shrink-0 bg-brand-500 hover:bg-brand-400 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
      >
        Enable
      </button>
      <button
        onClick={() => {
          setDismissed(true)
          localStorage.setItem(DISMISSED_KEY, 'true')
        }}
        className="flex-shrink-0 text-gray-500 hover:text-gray-300 text-lg leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
