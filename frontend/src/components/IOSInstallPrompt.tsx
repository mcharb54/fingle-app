import { useState } from 'react'
import Icon from './ui/Icon'

const DISMISSED_KEY = 'fingle_ios_install_dismissed'

export default function IOSInstallPrompt() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true',
  )

  if (dismissed) return null

  return (
    <div className="quiet sticky-note mx-4 mt-3 flex items-start gap-3">
      <Icon name="share" className="w-6 h-6 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-bold mb-1">Add Fingle to your home screen</p>
        <p className="text-pen-soft leading-relaxed">
          Tap <Icon name="share" className="inline-block w-4 h-4 align-text-bottom" /> then <strong className="text-pen">Add to Home Screen</strong> to get notified when friends send you a fingle.
        </p>
      </div>
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
