interface StatsData {
  totalUsers: number
  totalTransactions: number
  totalCategories: number
  averageSpending: number
  newUsersThisMonth: number
}

interface StatisticsPanelProps {
  stats: StatsData | null
}

const StatCard = ({
  icon,
  title,
  value,
  unit,
}: {
  icon: string
  title: string
  value: string | number
  unit?: string
}) => (
  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-3xl font-bold text-slate-50">{value}</p>
          {unit && <p className="text-sm text-slate-400">{unit}</p>}
        </div>
      </div>
      <div className="text-4xl">{icon}</div>
    </div>
  </div>
)

export default function StatisticsPanel({ stats }: StatisticsPanelProps) {
  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-slate-400">Loading statistics...</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon="👥" title="Total Users" value={stats.totalUsers} />
        <StatCard
          icon="💳"
          title="Total Transactions"
          value={stats.totalTransactions}
        />
        <StatCard icon="🏷️" title="Total Categories" value={stats.totalCategories} />
        <StatCard
          icon="💰"
          title="Average Spending"
          value={formatCurrency(stats.averageSpending)}
        />
        <StatCard
          icon="✨"
          title="New Users This Month"
          value={stats.newUsersThisMonth}
        />
      </div>

      {/* Insights Section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-50 mb-4">Quick Insights</h3>
        <ul className="space-y-3 text-sm text-slate-300">
          <li className="flex items-start gap-3">
            <span className="text-indigo-400 font-bold">•</span>
            <span>
              Total active users: <strong>{stats.totalUsers}</strong> registered accounts
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-indigo-400 font-bold">•</span>
            <span>
              Average spending per user: <strong>{formatCurrency(stats.averageSpending)}</strong>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-indigo-400 font-bold">•</span>
            <span>
              Transaction density: <strong>{stats.totalUsers > 0 ? (stats.totalTransactions / stats.totalUsers).toFixed(1) : 0}</strong> transactions per user
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-indigo-400 font-bold">•</span>
            <span>
              New users this month: <strong>{stats.newUsersThisMonth}</strong> new signups
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-indigo-400 font-bold">•</span>
            <span>
              Categories per user: <strong>{stats.totalUsers > 0 ? (stats.totalCategories / stats.totalUsers).toFixed(1) : 0}</strong> average categories
            </span>
          </li>
        </ul>
      </div>

      {/* Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-50 mb-4">User Engagement</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Transaction Activity</span>
                <span className="text-sm font-semibold text-slate-200">
                  {stats.totalUsers > 0
                    ? `${((stats.totalTransactions / stats.totalUsers) * 100 / 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, (stats.totalTransactions / (stats.totalUsers * 10)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-50 mb-4">Platform Health</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <span>Active Users:</span>
              <span className="text-indigo-400 font-semibold">{stats.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span>Tracked Transactions:</span>
              <span className="text-indigo-400 font-semibold">{stats.totalTransactions}</span>
            </div>
            <div className="flex justify-between">
              <span>Managed Categories:</span>
              <span className="text-indigo-400 font-semibold">{stats.totalCategories}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                ✓ All systems operational
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
