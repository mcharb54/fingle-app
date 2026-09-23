const PATHS = {
  home: <path d="M3.5 11 12 4l8.5 7v8.5a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />,
  camera: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="3.5" />
      <circle cx="12" cy="13.5" r="3.6" />
      <path d="M8.5 7l1.4-2.4h4.2L15.5 7" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="3.4" />
      <path d="M2.8 20c.7-3.5 3.2-5.4 6.2-5.4s5.5 1.9 6.2 5.4" />
      <circle cx="17" cy="8.2" r="2.5" />
      <path d="M16.4 13.5c2.6.2 4.4 2 5 5" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4.2a3 3 0 0 0 3.1 4.2M17 6h2.8a3 3 0 0 1-3.1 4.2M12 14v4M8 21h8" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4.3 4.2-6.4 8-6.4s7 2.1 8 6.4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10.5" rx="3" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  flip: (
    <>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7" />
      <path d="M20 4v4.7h-4.7" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3" />
      <path d="M4 20v-4.7h4.7" />
    </>
  ),
  check: <path d="M4.5 12.5l5 5L19.5 6.5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  plane: <path d="M21 3 3 10.5l7 2.5 2.5 7zM10 13l4.5-4.5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14.5c1.8 2 5.2 2 7 0" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="3" />
    </>
  ),
  share: (
    <>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M16 6l-4-4-4 4M12 2v13" />
    </>
  ),
} as const

export type IconName = keyof typeof PATHS

export default function Icon({ name, className = 'w-6 h-6' }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
