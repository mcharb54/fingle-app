import { useState } from 'react'
import Icon from './ui/Icon'

// Use a standalone-aware key so dismissing in a Safari tab doesn't
// prevent the prompt from appearing when launched from the home screen.
const isStandalone =
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true))

const DISMISSED_KEY = isStandalone ? 'fingle_push_dismissed_standalone' : 'fingle_push_dismissed'

export default function NotificationPrompt({ onEnable }: { onEnable: () => void }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true',
  )

  if (dismissed) return null

  return (
    <div className="quiet sticky-note mx-4 mt-3 flex items-center gap-3">
      <Icon name="bell" className="w-6 h-6 flex-shrink-0" />
      <p className="text-sm flex-1">Turn on notifications to hear when a friend sends you a fingle</p>
      <button onClick={onEnable} className="btn-pen flex-shrink-0 px-3 py-2 !text-sm">Turn on</button>
      <button
        onClick={() => {
          setDismissed(true)
          localStorage.setItem(DISMISSED_KEY, 'true')
        }}
        className="flex-shrink-0 text-pen-soft p-1"
        aria-label="Dismiss"
      >
        <Icon name="close" className="w-5 h-5" />
      </button>
    </div>
  )
}
