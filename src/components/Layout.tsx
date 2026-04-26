import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'

const NAV = [
  { to: '/dashboard', label: 'Home', icon: '⊞' },
  { to: '/transactions', label: 'Transactions', icon: '☰' },
  { to: '/budget', label: 'Budget', icon: '◎' },
  { to: '/analysis', label: 'Analysis', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()
  const { user } = useAuth()
  const profile = useProfile()

  return (
    <div className="flex flex-col min-h-screen max-w-5xl mx-auto">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-[#6941C6] px-4 py-3 flex items-center gap-2 shadow-lg">
        <button className="text-white/80 text-xl mr-1 transition-all duration-200 hover:text-white active:scale-95" onClick={() => navigate('/settings')}>≡</button>
        <span className="font-bold text-xl text-white tracking-tight flex-1">FinArt</span>
        {user?.email === 'alnahash@gmail.com' && (
          <button
            onClick={() => navigate('/admin')}
            className="text-white/80 text-xl px-1 transition-all duration-200 hover:text-white active:scale-95"
            title="Admin Panel"
          >
            ⚙️
          </button>
        )}
        <button
          onClick={toggle}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 text-sm font-medium active:scale-95"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className={isDark ? 'text-white/40' : 'text-white'}>☀️</span>
          <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${isDark ? 'bg-slate-500' : 'bg-yellow-400'}`} />
          <span className={isDark ? 'text-white' : 'text-white/40'}>🌙</span>
        </button>
        <button className="text-white/80 text-xl px-1 transition-all duration-200 hover:text-white active:scale-95" onClick={() => navigate('/transactions')}>🔍</button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-hidden pb-20 bg-app flex flex-col">
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t shadow-2xl" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto flex w-full">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-all duration-200 ${
                  isActive ? 'text-purple-400 scale-105' : 'text-secondary hover:text-primary hover:scale-110'
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
