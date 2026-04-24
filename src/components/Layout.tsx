import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

const NAV = [
  { to: '/dashboard', label: 'Home', icon: '⊞' },
  { to: '/transactions', label: 'Transactions', icon: '☰' },
  { to: '/budget', label: 'Budget', icon: '◎' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()

  return (
    <div className="flex flex-col min-h-screen max-w-5xl mx-auto">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-[#6941C6] px-4 py-3 flex items-center gap-2">
        <button className="text-white/80 text-xl mr-1" onClick={() => navigate('/settings')}>≡</button>
        <span className="font-bold text-xl text-white tracking-tight flex-1">FinArt</span>
        <button
          onClick={toggle}
          className="text-white/80 text-lg px-1"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <button className="text-white/80 text-xl px-1" onClick={() => navigate('/transactions')}>🔍</button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto pb-20 bg-app">
        <div className="overflow-hidden h-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto flex w-full">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                  isActive ? 'text-purple-400' : 'text-secondary hover:text-primary'
                }`
              }
            >
              <span className="text-lg leading-none">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
