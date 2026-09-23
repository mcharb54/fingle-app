import { NavLink } from 'react-router-dom'
import Icon, { type IconName } from './ui/Icon'

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Feed', icon: 'home' },
  { to: '/friends', label: 'Friends', icon: 'users' },
  { to: '/send', label: 'Send', icon: 'camera' },
  { to: '/leaderboard', label: 'Board', icon: 'trophy' },
  { to: '/profile', label: 'Me', icon: 'me' },
]

export default function NavBar() {
  return (
    <nav className="flex items-end paper-bar border-t-2 border-dashed border-pen-faint safe-bottom">
      {tabs.map(({ to, label, icon }) =>
        to === '/send' ? (
          <NavLink key={to} to={to} aria-label={label} className="flex-1 flex justify-center pb-2 -mt-4">
            {({ isActive }) => (
              <span
                className={`w-14 h-14 flex items-center justify-center bg-pen text-white border-2 border-pen transition-transform active:scale-95 ${isActive ? 'ring-4 ring-hi' : ''}`}
                style={{ borderRadius: '48% 52% 45% 55% / 55% 45% 55% 45%', boxShadow: '3px 3px 0 #F3FF4F' }}
              >
                <Icon name={icon} className="w-7 h-7" />
              </span>
            )}
          </NavLink>
        ) : (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 pt-2 pb-2 text-sm transition-colors ${isActive ? 'text-pen' : 'text-pen-faint'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`w-11 h-8 flex items-center justify-center ${isActive ? 'bg-hi' : ''}`}
                  style={{ borderRadius: '40% 55% 45% 60%' }}
                >
                  <Icon name={icon} />
                </span>
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ),
      )}
    </nav>
  )
}
