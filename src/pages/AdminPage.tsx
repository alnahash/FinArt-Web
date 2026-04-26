import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../components/admin/AdminLayout'
import UsersList from '../components/admin/UsersList'
import StatisticsPanel from '../components/admin/StatisticsPanel'
import { getAllUsers, getAppStatistics } from '../services/db'

type TabType = 'users' | 'statistics'

interface UserData {
  id: string
  full_name: string | null
  email: string | null
  currency: string
  created_at: string
  last_login_at: string | null
  login_count: number
}

interface StatsData {
  totalUsers: number
  totalTransactions: number
  totalCategories: number
  averageSpending: number
  newUsersThisMonth: number
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [stats, setStats] = useState<StatsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if user is admin
  useEffect(() => {
    if (user && user.email !== 'alnahash@gmail.com') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (activeTab === 'users') {
          const { data, error: err } = await getAllUsers()
          if (err) throw err
          setUsers(data ?? [])
        } else {
          const statsData = await getAppStatistics()
          setStats(statsData)
        }
      } catch (err) {
        console.error('Failed to fetch admin data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeTab])

  if (user?.email !== 'alnahash@gmail.com') {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-200 mb-4">Unauthorized</h1>
          <p className="text-slate-400">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'users' ? (
        <UsersList users={users} />
      ) : (
        <StatisticsPanel stats={stats} />
      )}
    </AdminLayout>
  )
}
