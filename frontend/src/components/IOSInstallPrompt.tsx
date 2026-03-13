import { useState } from 'react'

const DISMISSED_KEY = 'fingle_ios_install_dismissed'

export default function IOSInstallPrompt() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true',
  )

  if (dismissed) return null

  return (
    <div className="mx-4 mt-3 flex items-start gap-3 bg-zinc-900 rounded-2xl p-4">
      <span className="text-2xl flex-shrink-0">📲</span>
      <div className="flex-1 text-white text-sm">
        <p className="font-semibold mb-1">Install Fingle for notifications</p>
        <p className="text-gray-400 text-xs leading-relaxed">
          Tap{' '}
          <svg
            className="inline-block w-4 h-4 align-text-bottom"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>{' '}
          then <strong>"Add to Home Screen"</strong> to get push notifications when friends challenge
          you.
        </p>
      </div>
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
