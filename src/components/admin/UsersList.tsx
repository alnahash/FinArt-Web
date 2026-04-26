import { useState, useMemo } from 'react'

interface User {
  id: string
  full_name: string | null
  email: string | null
  currency: string
  created_at: string
  last_login_at: string | null
  login_count: number
  email_confirmed: boolean
}

interface UsersListProps {
  users: User[]
}

type SortField = 'created_at' | 'last_login_at' | 'login_count' | 'full_name'

export default function UsersList({ users }: UsersListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = users.filter(user => {
      const query = searchQuery.toLowerCase()
      return (
        (user.full_name?.toLowerCase().includes(query) ?? false) ||
        (user.email?.toLowerCase().includes(query) ?? false)
      )
    })

    result.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (sortField === 'created_at' || sortField === 'last_login_at') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }

      if (aVal < bVal) return sortAsc ? -1 : 1
      if (aVal > bVal) return sortAsc ? 1 : -1
      return 0
    })

    return result
  }, [users, searchQuery, sortField, sortAsc])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getActivityStatus = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never'
    const days = Math.floor((Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}m ago`
  }

  return (
    <div className="space-y-4">
      {/* Header with search and stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-sm text-slate-400">
          {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-slate-800/50 rounded-lg border border-slate-700">
        <table className="w-full">
          <thead className="border-b border-slate-700 bg-slate-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                <button
                  onClick={() => handleSort('full_name')}
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  Name {sortField === 'full_name' && (sortAsc ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Currency</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                <button
                  onClick={() => handleSort('created_at')}
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  Joined {sortField === 'created_at' && (sortAsc ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                <button
                  onClick={() => handleSort('last_login_at')}
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  Last Login {sortField === 'last_login_at' && (sortAsc ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                <button
                  onClick={() => handleSort('login_count')}
                  className="hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  Logins {sortField === 'login_count' && (sortAsc ? '↑' : '↓')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((user, idx) => (
                <tr
                  key={user.id}
                  className={`border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors ${
                    idx % 2 === 0 ? 'bg-slate-900/20' : ''
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-slate-200 font-medium">
                    {user.full_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{user.email || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{user.currency}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">{formatDate(user.created_at)}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {formatDate(user.last_login_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-200 font-medium">{user.login_count}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        !user.email_confirmed
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : user.last_login_at
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {!user.email_confirmed ? 'Unverified' : getActivityStatus(user.last_login_at)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded-lg transition-colors text-sm font-medium"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded-lg transition-colors text-sm font-medium"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
