import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, subMonths } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { getMonthlySummary, getTransactions, getCategories, insertTransaction, getMonthlyTotals } from '../services/db'
import { fmt as fmtCurrency } from '../lib/currency'
import type { Transaction, Category } from '../types'
import TransactionCard from '../components/TransactionCard'
import AddTransactionModal from '../components/AddTransactionModal'
import TransactionDetailModal from '../components/TransactionDetailModal'

const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

export default function DashboardPage() {
  const { user } = useAuth()
  const profile = useProfile()
  const currency = profile?.currency ?? 'BHD'
  const navigate = useNavigate()

  const [currentDate] = useState(new Date())
  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  const [totalDebit, setTotalDebit] = useState(0)
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [monthlyData, setMonthlyData] = useState<{ month: number; year: number; debit: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(currentDate, 5 - i)
    return { month: d.getMonth() + 1, year: d.getFullYear() }
  })

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [sumRes, catsRes, txsRes, monthlyRes] = await Promise.all([
      getMonthlySummary(user.id, month, year),
      getCategories(user.id),
      getTransactions(user.id, { month, year }, 5, 0),
      getMonthlyTotals(user.id, periods),
    ])
    setTotalDebit(sumRes.totalDebit)
    setCategories(catsRes.data ?? [])
    setRecentTxs(txsRes.data as Transaction[] ?? [])
    setMonthlyData(monthlyRes.map(r => ({ month: r.month, year: r.year, debit: r.debit })))
    setLoading(false)
  }, [user, month, year])

  useEffect(() => { loadData() }, [loadData])

  const handleAddTx = async (tx: Parameters<typeof insertTransaction>[1]) => {
    if (!user) return
    await insertTransaction(user.id, tx)
    await loadData()
  }

  const monthlyBudget = profile?.monthly_budget ?? 0
  const debits = monthlyData.map(d => d.debit)
  const avg = debits.length ? debits.reduce((a, b) => a + b, 0) / debits.length : 0
  const avgPct = avg > 0 ? Math.round((totalDebit / avg) * 100) : 0
  const budgetPct = monthlyBudget > 0 ? Math.min((totalDebit / monthlyBudget) * 100, 100) : 0
  const overBudget = monthlyBudget > 0 && totalDebit > monthlyBudget

  return (
    <div className="bg-app min-h-full">

      {/* Personal sub-header */}
      <div className="flex justify-end px-4 pt-3 pb-1">
        <span className="text-slate-400 text-sm flex items-center gap-1">👤 Personal</span>
      </div>

      {/* ── Expenses section ── */}
      <div className="px-4 pt-1 pb-3">
        <p className="text-slate-300 text-base font-light mb-1">Expenses</p>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-white text-2xl font-bold">{fmtCurrency(totalDebit, currency)}</span>
            {monthlyBudget > 0 && (
              <span className="text-green-400 text-base font-medium">
                ({Number(monthlyBudget).toLocaleString()})
              </span>
            )}
          </div>
          {avg > 0 && <span className="text-white text-2xl font-bold">{avgPct}%</span>}
        </div>

        <div className="flex justify-between text-slate-400 text-xs mt-0.5 mb-3">
          <span>{format(currentDate, 'MMMM-yyyy')}</span>
          {avg > 0 && <span>of monthly avg</span>}
        </div>

        {/* Chart */}
        {!loading && monthlyData.length > 0 && (
          <div className="rounded-xl overflow-hidden bg-surface">
            <ExpenseChart data={monthlyData} avg={avg} />
          </div>
        )}
        {loading && <div className="h-40 rounded-xl bg-slate-800 animate-pulse" />}
      </div>

      <button
        onClick={() => navigate('/transactions')}
        className="mx-4 mb-6 text-purple-400 text-xs font-bold tracking-[0.15em] uppercase"
      >
        VIEW DETAILS
      </button>

      {/* ── Budgets section ── */}
      <div className="px-4 mb-2">
        <p className="text-slate-200 text-base font-light mb-3">Budgets</p>

        {monthlyBudget > 0 ? (
          <>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-300 text-sm font-medium">Monthly Budget</span>
              <span className="text-slate-400 text-xs">
                Spent {Number(totalDebit.toFixed(2)).toLocaleString()} of {Number(monthlyBudget).toLocaleString()}
              </span>
            </div>
            <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : budgetPct >= 80 ? 'bg-orange-400' : 'bg-indigo-500'}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-sm">No monthly budget set. Go to Settings to set one.</p>
        )}
      </div>

      <button
        onClick={() => navigate('/budget')}
        className="mx-4 mb-6 text-purple-400 text-xs font-bold tracking-[0.15em] uppercase"
      >
        MANAGE ALL BUDGETS
      </button>

      {/* ── Latest transactions ── */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-200 text-base font-light">Latest transactions</p>
          {recentTxs.length > 0 && (
            <span className="text-slate-400 text-sm">
              <span className="text-white text-xl font-bold">{recentTxs.length}</span> new
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0,1,2].map(i => <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : recentTxs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm mb-3">No transactions this month</p>
            <button className="btn-primary text-sm" onClick={() => setShowAdd(true)}>+ Add Transaction</button>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-slate-800 divide-y divide-slate-800">
            {recentTxs.map(tx => (
              <TransactionCard key={tx.id} tx={tx} onClick={() => setSelectedTx(tx)} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-purple-500 hover:bg-purple-400 text-white rounded-full shadow-lg text-3xl flex items-center justify-center transition-colors z-20 shadow-purple-900"
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

// ── SVG Line Chart ────────────────────────────────────────────────────────────

function ExpenseChart({ data, avg }: {
  data: { month: number; year: number; debit: number }[]
  avg: number
}) {
  const W = 360, H = 160
  const PADL = 8, PADR = 28, PADT = 28, PADB = 22
  const plotW = W - PADL - PADR
  const plotH = H - PADT - PADB

  const values = data.map(d => d.debit)
  const maxVal = Math.max(...values, avg) * 1.2 || 1000

  const xAt = (i: number) => PADL + (i / Math.max(values.length - 1, 1)) * plotW
  const yAt = (v: number) => PADT + plotH - (v / maxVal) * plotH

  const pts = values.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
  const linePts = pts.join(' ')
  const areaPts = `${xAt(0).toFixed(1)},${(PADT + plotH).toFixed(1)} ${linePts} ${xAt(values.length - 1).toFixed(1)},${(PADT + plotH).toFixed(1)}`
  const avgY = yAt(avg).toFixed(1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9333ea" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#9333ea" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <polygon points={areaPts} fill="url(#cg)" />

      {/* Avg dashed line */}
      {avg > 0 && <>
        <line x1={PADL} y1={avgY} x2={W - PADR} y2={avgY}
          stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="4,3" />
        <text x={PADL + 3} y={Number(avgY) - 4}
          fill="rgba(255,255,255,0.45)" fontSize="8">
          Avg {Math.round(avg).toLocaleString()}
        </text>
      </>}

      {/* White line */}
      <polyline points={linePts} fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />

      {/* Points + labels + month names */}
      {values.map((v, i) => {
        const cx = xAt(i), cy = yAt(v)
        const label = v > 0 ? Math.round(v).toLocaleString() : '0'
        const isFirst = i === 0, isLast = i === values.length - 1
        const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
        return (
          <g key={i}>
            <text x={cx} y={cy - 7} textAnchor={anchor} fill="white" fontSize="8.5" fontWeight="600">
              {label}
            </text>
            <circle cx={cx} cy={cy} r="3.5" fill="white" />
            <text x={cx} y={H - 5} textAnchor={anchor} fill="rgba(255,255,255,0.5)" fontSize="8.5">
              {MONTH_SHORT[data[i].month - 1]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
