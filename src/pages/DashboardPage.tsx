import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addMonths, subMonths } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { getMonthlySummary, getCategorySpending, getTransactions, getCategories, insertTransaction } from '../services/db'
import type { MonthlySummary, CategorySpending, Transaction, Category } from '../types'
import TransactionCard from '../components/TransactionCard'
import AddTransactionModal from '../components/AddTransactionModal'
import TransactionDetailModal from '../components/TransactionDetailModal'
import { useProfile } from '../hooks/useProfile'
import { fmt as fmtCurrency } from '../lib/currency'

export default function DashboardPage() {
  const { user } = useAuth()
  const profile = useProfile()
  const currency = profile?.currency ?? 'BHD'
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [catSpending, setCatSpending] = useState<CategorySpending[]>([])
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [sumRes, catsRes, txsRes] = await Promise.all([
      getMonthlySummary(user.id, month, year),
      getCategories(user.id),
      getTransactions(user.id, { month, year }, 5, 0),
    ])
    const cats = catsRes.data ?? []
    setSummary(sumRes)
    setCategories(cats)
    setRecentTxs(txsRes.data as Transaction[] ?? [])
    const spending = await getCategorySpending(user.id, month, year, cats)
    setCatSpending(spending.slice(0, 5))
    setLoading(false)
  }, [user, month, year])

  useEffect(() => { loadData() }, [loadData])

  const handleAddTx = async (tx: Parameters<typeof insertTransaction>[1]) => {
    if (!user) return
    await insertTransaction(user.id, tx)
    await loadData()
  }

  const fmt = (n: number) => fmtCurrency(n, currency)

  return (
    <div className="p-4 space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <button className="btn-ghost" onClick={() => setCurrentDate(d => subMonths(d, 1))}>‹</button>
        <h2 className="font-semibold text-slate-200">{format(currentDate, 'MMMM yyyy')}</h2>
        <button
          className="btn-ghost"
          onClick={() => setCurrentDate(d => addMonths(d, 1))}
          disabled={format(currentDate, 'MM/yyyy') === format(new Date(), 'MM/yyyy')}
        >›</button>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => <div key={i} className="card h-20 animate-pulse bg-slate-700" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Spent" value={fmt(summary?.totalDebit ?? 0)} color="text-red-400" />
          <SummaryCard label="Income" value={fmt(summary?.totalCredit ?? 0)} color="text-green-400" />
          <SummaryCard
            label="Savings"
            value={fmt(summary?.netSavings ?? 0)}
            color={(summary?.netSavings ?? 0) >= 0 ? 'text-indigo-400' : 'text-red-400'}
          />
        </div>
      )}

      {/* Top spending categories */}
      {catSpending.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-200 text-sm">Top Categories</h3>
          {catSpending.map(cs => (
            <div key={cs.category.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{cs.category.name}</span>
                <span className="text-slate-400">
                  {fmtCurrency(cs.spent, currency)}
                  {cs.budget > 0 && ` / ${fmtCurrency(cs.budget, currency)}`}
                </span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    cs.percentage >= 90 ? 'bg-red-500' : cs.percentage >= 70 ? 'bg-yellow-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${cs.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent transactions */}
      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="font-semibold text-slate-200 text-sm">Recent Transactions</h3>
          <button className="text-xs text-indigo-400 hover:text-indigo-300" onClick={() => navigate('/transactions')}>
            See all →
          </button>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-12 bg-slate-700 rounded-xl animate-pulse" />)}
          </div>
        ) : recentTxs.length === 0 ? (
          <EmptyTx onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="divide-y divide-slate-700/50">
            {recentTxs.map(tx => (
              <TransactionCard key={tx.id} tx={tx} onClick={() => setSelectedTx(tx)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full shadow-lg text-2xl flex items-center justify-center transition-colors z-20"
      >
        +
      </button>

      {showAdd && (
        <AddTransactionModal
          categories={categories}
          currency={currency}
          onClose={() => setShowAdd(false)}
          onSave={handleAddTx}
        />
      )}
      {selectedTx && (
        <TransactionDetailModal
          tx={selectedTx}
          categories={categories}
          onClose={() => setSelectedTx(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-bold ${color} leading-tight`}>{value}</p>
    </div>
  )
}

function EmptyTx({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="p-6 text-center">
      <p className="text-slate-400 text-sm mb-3">No transactions this month</p>
      <button className="btn-primary text-sm" onClick={onAdd}>+ Add Transaction</button>
    </div>
  )
}
