import { useNavigate } from 'react-router-dom'

interface AdminSidebarProps {
  activeTab: 'users' | 'statistics'
  onTabChange: (tab: 'users' | 'statistics') => void
}

export default function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const navigate = useNavigate()

  const menuItems = [
    {
      id: 'users',
      label: 'Users',
      icon: '👥',
      description: 'Manage all registered users',
      action: () => onTabChange('users'),
    },
    {
      id: 'statistics',
      label: 'Statistics',
      icon: '📈',
      description: 'View app analytics',
      action: () => onTabChange('statistics'),
    },
  ]

  return (
    <aside className="w-64 bg-slate-900/50 border-r border-slate-800 h-full">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-lg font-bold text-slate-50">Admin Menu</h2>
        <p className="text-xs text-slate-400 mt-1">System Management</p>
      </div>

      {/* Menu Items */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 border ${
              activeTab === item.id
                ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-800/30 border-slate-700/30 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600/50 hover:text-slate-200'
            }`}
            title={item.description}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <div>
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
              </div>
            </div>
          </button>
        ))}
      </nav>

      {/* Quick Actions */}
      <div className="px-4 py-6 border-t border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800/30 rounded transition-all"
          >
            ↗ Exit Admin Panel
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800/30 rounded transition-all"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-0 left-0 w-64 px-4 py-4 border-t border-slate-800 bg-slate-950/50 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span>Admin Panel</span>
          <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs font-medium">Active</span>
        </div>
      </div>
    </aside>
  )
}
