import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Feed', icon: '🏠' },
  { to: '/send', label: 'Send', icon: '📷' },
  { to: '/friends', label: 'Friends', icon: '👥' },
  { to: '/leaderboard', label: 'Board', icon: '🏆' },
  { to: '/profile', label: 'Me', icon: '👤' },
]

export default function NavBar() {
  return (
    <nav className="flex bg-zinc-900 border-t border-white/10 safe-bottom">
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
              isActive ? 'text-brand-400' : 'text-gray-500'
            }`
          }
        >
          <span className="text-xl leading-none">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
