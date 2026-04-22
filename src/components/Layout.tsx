import { Outlet, NavLink } from 'react-router-dom'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/transactions', label: 'Transactions', icon: '☰' },
  { to: '/budget', label: 'Budget', icon: '◎' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-2">
        <span className="text-xl">💰</span>
        <span className="font-bold text-lg text-indigo-400 tracking-tight">FinArt</span>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-slate-900 border-t border-slate-800">
        <div className="max-w-2xl mx-auto flex">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
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
