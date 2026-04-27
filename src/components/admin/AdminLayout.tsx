import { signOut } from '../../services/db'
import { useNavigate } from 'react-router-dom'

type TabType = 'users' | 'statistics'

interface AdminLayoutProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  children: React.ReactNode
}

export default function AdminLayout({ activeTab, onTabChange, children }: AdminLayoutProps) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚙️</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-50">Admin Control Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
            >
              ← Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800">
          <div className="flex gap-8">
            <button
              onClick={() => onTabChange('users')}
              className={`px-4 py-4 font-medium text-sm transition-all border-b-2 ${
                activeTab === 'users'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              📋 Users
            </button>
            <button
              onClick={() => onTabChange('statistics')}
              className={`px-4 py-4 font-medium text-sm transition-all border-b-2 ${
                activeTab === 'statistics'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              📊 Statistics
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  )
}
