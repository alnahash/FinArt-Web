import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, subMonths, setDate, addMonths, isSameMonth } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { getMonthlySummary, getTransactions, getCategories, insertTransaction, getMonthlyTotals, getCategorySpending } from '../services/db'
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
  const hideAmounts = profile?.hide_amounts ?? false
  const startDay = profile?.month_start_day ?? 1
  const navigate = useNavigate()

  const [currentDate, setCurrentDate] = useState(new Date())

  const { periodStartDate, periodEndDate, month, year } = useMemo(() => {
    const currentDayOfMonth = currentDate.getDate()
    let pStart: Date
    if (currentDayOfMonth >= startDay) {
      pStart = setDate(currentDate, startDay)
    } else {
      pStart = setDate(subMonths(currentDate, 1), startDay)
    }
    const pEnd = setDate(addMonths(pStart, 1), startDay - 1)
    return {
      periodStartDate: pStart,
      periodEndDate: pEnd,
      month: pStart.getMonth() + 1,
      year: pStart.getFullYear()
    }
  }, [currentDate, startDay])

  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, netSavings: 0 })
  const [prevSummary, setPrevSummary] = useState({ totalDebit: 0, totalCredit: 0, netSavings: 0 })
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [monthlyData, setMonthlyData] = useState<{ month: number; year: number; debit: number }[]>([])
  const [categorySpending, setCategorySpending] = useState<{ [key: string]: number }>({})
  const [prevCategorySpending, setPrevCategorySpending] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)

  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(periodStartDate, 5 - i)
    return { month: d.getMonth() + 1, year: d.getFullYear() }
  })

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [sumRes, catsRes, txsRes, monthlyRes] = await Promise.all([
        getMonthlySummary(user.id, month, year, startDay),
        getCategories(user.id),
        getTransactions(user.id, { month, year }, 5, 0, startDay),
        getMonthlyTotals(user.id, periods, startDay),
      ])

      const allCategories = catsRes.data ?? []
      setSummary(sumRes)
      setCategories(allCategories)
      setRecentTxs(txsRes.data as Transaction[] ?? [])
      setMonthlyData(monthlyRes.map(r => ({ month: r.month, year: r.year, debit: r.debit })))

      // Fetch category spending and previous month data
      const prevMonthStart = subMonths(periodStartDate, 1)
      const prevMonth = prevMonthStart.getMonth() + 1
      const prevYear = prevMonthStart.getFullYear()

      const [catSpendRes, prevSumRes, prevCatSpendRes] = await Promise.all([
        getCategorySpending(user.id, month, year, allCategories, startDay),
        getMonthlySummary(user.id, prevMonth, prevYear, startDay),
        getCategorySpending(user.id, prevMonth, prevYear, allCategories, startDay),
      ])

      // Convert category spending to object for easier lookup
      const catMap: { [key: string]: number } = {}
      const prevCatMap: { [key: string]: number } = {}

      catSpendRes?.forEach((cs: any) => {
        if (!cs.isIncome) {
          catMap[cs.category.id] = cs.spent || 0
        }
      })

      prevCatSpendRes?.forEach((cs: any) => {
        if (!cs.isIncome) {
          prevCatMap[cs.category.id] = cs.spent || 0
        }
      })

      setCategorySpending(catMap)
      setPrevCategorySpending(prevCatMap)
      setPrevSummary(prevSumRes)
    } finally {
      setLoading(false)
    }
  }, [user, month, year, startDay, currentDate])

  useEffect(() => { loadData() }, [loadData])

  const handleAddTx = async (tx: Parameters<typeof insertTransaction>[1]) => {
    if (!user) return
    await insertTransaction(user.id, tx)
    await loadData()
  }

  const monthlyBudget = profile?.monthly_budget ?? 0
  const debits = monthlyData.map(d => d.debit)
  const avg = debits.length ? debits.reduce((a, b) => a + b, 0) / debits.length : 0
  const avgPct = avg > 0 ? Math.round((summary.totalDebit / avg) * 100) : 0
  const budgetPct = monthlyBudget > 0 ? Math.min((summary.totalDebit / monthlyBudget) * 100, 100) : 0
  const overBudget = monthlyBudget > 0 && summary.totalDebit > monthlyBudget

  const mask = (val: number) => hideAmounts ? '••••' : fmtCurrency(val, currency)

  // Get top 3 categories
  const topCategories = Object.entries(categorySpending)
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId)
      return { name: cat?.name || 'Other', amount, catId }
    })

  // Calculate category changes
  const categoryChanges = Object.entries(categorySpending)
    .map(([catId, current]) => {
      const prev = prevCategorySpending[catId] || 0
      const change = current - prev
      const cat = categories.find(c => c.id === catId)
      return { name: cat?.name || 'Other', current, prev, change }
    })
    .filter(c => c.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3)

  // Calculate savings rate
  const savingsRate = summary.totalCredit > 0 ? Math.round((summary.netSavings / summary.totalCredit) * 100) : 0
  const prevSavingsRate = prevSummary.totalCredit > 0 ? Math.round((prevSummary.netSavings / prevSummary.totalCredit) * 100) : 0

  // Calculate spending trend
  const spendingChange = summary.totalDebit - prevSummary.totalDebit
  const spendingChangePercent = prevSummary.totalDebit > 0 ? Math.round((spendingChange / prevSummary.totalDebit) * 100) : 0

  // Calculate financial health score
  const healthScore = useMemo(() => {
    let score = 50
    if (summary.totalCredit > 0) score += 15
    if (summary.netSavings >= 0) score += 25
    if (!overBudget && monthlyBudget > 0) score += 10
    if (savingsRate >= 20) score += 10 // bonus for good savings rate
    return Math.min(100, score)
  }, [summary, overBudget, monthlyBudget, savingsRate])

  // Generate recommendations
  const recommendations = useMemo(() => {
    const recs: string[] = []

    if (summary.totalCredit === 0 && summary.totalDebit > 0) {
      recs.push('💡 No income recorded this month. Track all income sources.')
    }
    if (savingsRate < 10 && summary.totalCredit > 0) {
      recs.push('💡 Savings rate is low. Consider reducing discretionary spending.')
    }
    if (spendingChangePercent > 20) {
      recs.push(`⚠️ Spending increased ${spendingChangePercent}% from last month. Review expense categories.`)
    } else if (spendingChangePercent < -20) {
      recs.push(`✅ Great job! Spending decreased ${Math.abs(spendingChangePercent)}% compared to last month.`)
    }
    if (topCategories.length > 0 && topCategories[0].amount > (summary.totalDebit * 0.4)) {
      recs.push(`🎯 ${topCategories[0].name} is ${Math.round((topCategories[0].amount / summary.totalDebit) * 100)}% of your spending. Consider optimizing.`)
    }
    if (!overBudget && monthlyBudget > 0 && budgetPct >= 80) {
      recs.push('⚠️ You\'re at 80% of your budget. Slow down spending to stay within limits.')
    }
    if (overBudget) {
      recs.push(`❌ You're ${Math.round(budgetPct - 100)}% over budget. Review spending in remaining days.`)
    }
    if (summary.netSavings > 0) {
      recs.push(`💰 You saved ${fmtCurrency(summary.netSavings, currency)} this month. Keep it up!`)
    }

    return recs.slice(0, 3)
  }, [summary, savingsRate, spendingChangePercent, topCategories, overBudget, monthlyBudget, budgetPct])

  // Get spending volatility indicator
  const spendingVolatility = useMemo(() => {
    if (monthlyData.length < 2) return 'insufficient data'
    const debits = monthlyData.map(d => d.debit)
    const mean = debits.reduce((a, b) => a + b, 0) / debits.length
    const variance = debits.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / debits.length
    const stdDev = Math.sqrt(variance)
    const cv = mean > 0 ? (stdDev / mean) * 100 : 0
    if (cv < 20) return 'stable'
    if (cv < 50) return 'moderate'
    return 'volatile'
  }, [monthlyData])

  return (
    <div className="bg-app min-h-full">

      <div className="flex justify-end px-4 pt-3 pb-1">
        <span className="text-slate-400 text-sm flex items-center gap-1">👤 Personal</span>
      </div>

      {/* Month selector */}
      <div className="px-4 pt-3 pb-3 flex items-center justify-between gap-2">
        <button className="btn-ghost" onClick={() => setCurrentDate(d => subMonths(d, 1))}>‹</button>
        <span className="font-semibold text-slate-200 flex-1 text-center text-sm">{format(periodStartDate, 'd MMMM yyyy')} - {format(periodEndDate, 'd MMMM yyyy')}</span>
        {!isSameMonth(currentDate, new Date()) && (
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg bg-indigo-500/10 transition-colors"
          >Today</button>
        )}
        <button
          className="btn-ghost"
          onClick={() => setCurrentDate(d => addMonths(d, 1))}
          disabled={isSameMonth(currentDate, new Date())}
        >›</button>
      </div>

      {/* Expenses + Net Savings */}
      <div className="px-4 pt-1 pb-3">
        <p className="text-slate-300 text-base font-light mb-1">Expenses</p>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-white text-2xl font-bold">{mask(summary.totalDebit)}</span>
            {monthlyBudget > 0 && (
              <span className="text-green-400 text-base font-medium">
                ({hideAmounts ? '••••' : Number(monthlyBudget).toLocaleString()})
              </span>
            )}
          </div>
          {avg > 0 && <span className="text-white text-2xl font-bold">{avgPct}%</span>}
        </div>

        <div className="flex justify-between text-slate-400 text-xs mt-0.5 mb-3">
          <span>{format(periodStartDate, 'd MMMM yyyy')} - {format(periodEndDate, 'd MMMM yyyy')}</span>
          {avg > 0 && <span>of monthly avg</span>}
        </div>

        {/* Income and Expenses summary */}
        <div className="grid grid-cols-2 gap-3 mb-3 px-1">
          <div>
            <p className="text-xs text-slate-500 mb-1">Total Income</p>
            <p className="text-sm font-semibold text-green-400">{mask(summary.totalCredit)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Total Expenses</p>
            <p className="text-sm font-semibold text-red-400">{mask(summary.totalDebit)}</p>
          </div>
        </div>

        {/* Net savings row */}
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Savings</span>
            <span className={`text-xs font-semibold ${summary.netSavings >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
              {summary.netSavings >= 0 ? '+' : '−'}{mask(Math.abs(summary.netSavings))}
            </span>
          </div>
        </div>

        {/* Chart */}
        {!loading && monthlyData.length > 0 && (
          <div className="rounded-xl overflow-hidden bg-surface">
            <ExpenseChart data={monthlyData} avg={avg} />
          </div>
        )}
        {loading && <div className="h-40 rounded-xl bg-slate-800 animate-pulse" />}
      </div>

      <button onClick={() => navigate('/transactions')}
        className="mx-4 mb-6 text-purple-400 text-xs font-bold tracking-[0.15em] uppercase">
        VIEW DETAILS
      </button>

      {/* Analysis */}
      {!loading && (
        <div className="px-4 mb-6">
          <p className="text-slate-200 text-base font-light mb-4">Insights</p>

          {/* Income vs Expenses */}
          <div className="bg-surface rounded-xl p-4 mb-4 border border-slate-700">
            <p className="text-slate-400 text-xs font-medium mb-3">INCOME vs EXPENSES</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-500 text-xs mb-1">Total Income</p>
                <p className="text-green-400 text-lg font-semibold">{mask(summary.totalCredit)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Total Expenses</p>
                <p className="text-red-400 text-lg font-semibold">{mask(summary.totalDebit)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-slate-500 text-xs mb-1">Savings Rate</p>
              <p className={`text-base font-semibold ${savingsRate >= 0 ? 'text-indigo-400' : 'text-red-400'}`}>
                {savingsRate}% {prevSavingsRate !== savingsRate && (
                  <span className={`text-xs ml-2 ${savingsRate > prevSavingsRate ? 'text-green-400' : 'text-red-400'}`}>
                    {savingsRate > prevSavingsRate ? '↑' : '↓'} {Math.abs(savingsRate - prevSavingsRate)}%
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Top Categories */}
          {topCategories.length > 0 && (
            <div className="bg-surface rounded-xl p-4 mb-4 border border-slate-700">
              <p className="text-slate-400 text-xs font-medium mb-3">TOP EXPENSE CATEGORIES</p>
              <p className="text-slate-300 text-sm mb-3">
                Most of your expenses are{' '}
                <span className="text-white font-semibold">{topCategories.map((c, i) => (
                  <span key={c.name}>
                    {c.name} ({mask(c.amount)}){i < topCategories.length - 1 ? ', ' : ''}
                  </span>
                ))}</span>
              </p>
            </div>
          )}

          {/* Month-over-Month Changes */}
          {spendingChange !== 0 && (
            <div className="bg-surface rounded-xl p-4 mb-4 border border-slate-700">
              <p className="text-slate-400 text-xs font-medium mb-3">COMPARED TO LAST MONTH</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Overall Spending</span>
                  <span className={`text-sm font-semibold ${spendingChange > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {spendingChange > 0 ? '+' : '−'}{mask(Math.abs(spendingChange))} ({spendingChangePercent > 0 ? '+' : ''}{spendingChangePercent}%)
                  </span>
                </div>
                {categoryChanges.map((change) => (
                  <div key={change.name} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{change.name}</span>
                    <span className={change.change > 0 ? 'text-red-400' : 'text-green-400'}>
                      {change.change > 0 ? '+' : '−'}{mask(Math.abs(change.change))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Health Score */}
          <div className="bg-surface rounded-xl p-4 mb-4 border border-slate-700">
            <p className="text-slate-400 text-xs font-medium mb-3">FINANCIAL HEALTH</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs mb-1">Overall Score</p>
                <p className="text-2xl font-bold text-indigo-400">{healthScore}</p>
              </div>
              <div className="flex-1 ml-6">
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      healthScore >= 80 ? 'bg-green-500' :
                      healthScore >= 60 ? 'bg-blue-500' :
                      healthScore >= 40 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  {healthScore >= 80 ? '💚 Excellent' :
                   healthScore >= 60 ? '💙 Good' :
                   healthScore >= 40 ? '💛 Fair' :
                   '❤️ Needs Improvement'}
                </p>
              </div>
            </div>
          </div>

          {/* Personalized Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-surface rounded-xl p-4 mb-4 border border-slate-700">
              <p className="text-slate-400 text-xs font-medium mb-3">RECOMMENDATIONS</p>
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <p key={i} className="text-slate-300 text-sm leading-relaxed">
                    {rec}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Spending Analysis */}
          <div className="bg-surface rounded-xl p-4 mb-4 border border-slate-700">
            <p className="text-slate-400 text-xs font-medium mb-3">SPENDING ANALYSIS</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Pattern</span>
                <span className="text-slate-300 font-semibold capitalize">
                  {spendingVolatility === 'stable' ? '📊 Stable' :
                   spendingVolatility === 'moderate' ? '📈 Moderate' :
                   '🎢 Volatile'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trend</span>
                <span className={`font-semibold ${spendingChange > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                  {spendingChange > 0 ? '📈 Increasing' : spendingChange < 0 ? '📉 Decreasing' : '➡️ Stable'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monthly Avg</span>
                <span className="text-slate-300 font-semibold">{mask(avg)}</span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-surface rounded-xl p-4 border border-slate-700">
            <p className="text-slate-400 text-xs font-medium mb-3">KEY METRICS</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Average Spending</span>
                <span className="text-slate-300 font-semibold">{mask(summary.totalDebit / 30)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">vs Monthly Average</span>
                <span className={`font-semibold ${summary.totalDebit <= avg ? 'text-green-400' : 'text-orange-400'}`}>
                  {summary.totalDebit <= avg ? '✓ Under' : '⚠ Over'} by {mask(Math.abs(summary.totalDebit - avg))}
                </span>
              </div>
              {monthlyBudget > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Budget Status</span>
                  <span className={`font-semibold ${!overBudget ? 'text-green-400' : 'text-red-400'}`}>
                    {overBudget ? `⚠ Over by ${mask(summary.totalDebit - monthlyBudget)}` : `✓ On track (${budgetPct.toFixed(0)}%)`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Budgets */}
      <div className="px-4 mb-2">
        <p className="text-slate-200 text-base font-light mb-3">Budgets</p>
        {monthlyBudget > 0 ? (
          <>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-300 text-sm font-medium">Monthly Budget</span>
              <span className="text-slate-400 text-xs">
                {hideAmounts ? '••••' : `Spent ${Number(summary.totalDebit.toFixed(2)).toLocaleString()} of ${Number(monthlyBudget).toLocaleString()}`}
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

      <button onClick={() => navigate('/budget')}
        className="mx-4 mb-6 text-purple-400 text-xs font-bold tracking-[0.15em] uppercase">
        MANAGE ALL BUDGETS
      </button>

      {/* Latest transactions */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-slate-200 text-base font-light">Latest transactions</p>
          {recentTxs.length > 0 && (
            <span className="text-slate-400 text-sm">
              <span className="text-white text-xl font-bold">{recentTxs.length}</span> recent
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
              <TransactionCard key={tx.id} tx={tx} currency={currency} hideAmounts={hideAmounts} onClick={() => setSelectedTx(tx)} />
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-purple-500 hover:bg-purple-400 text-white rounded-full shadow-lg text-3xl flex items-center justify-center transition-colors z-20 shadow-purple-900">
        +
      </button>

      {showAdd && (
        <AddTransactionModal categories={categories} currency={currency}
          onClose={() => setShowAdd(false)} onSave={handleAddTx} />
      )}
      {selectedTx && (
        <TransactionDetailModal tx={selectedTx} categories={categories}
          currency={currency} hideAmounts={hideAmounts}
          onClose={() => setSelectedTx(null)} onUpdated={loadData} />
      )}
    </div>
  )
}

function ExpenseChart({ data, avg }: { data: { month: number; year: number; debit: number }[]; avg: number }) {
  const W = 360, H = 160
  const PADL = 8, PADR = 28, PADT = 28, PADB = 22
  const plotW = W - PADL - PADR
  const plotH = H - PADT - PADB
  const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

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
      <polygon points={areaPts} fill="url(#cg)" />
      {avg > 0 && <>
        <line x1={PADL} y1={avgY} x2={W - PADR} y2={avgY}
          stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="4,3" />
        <text x={PADL + 3} y={Number(avgY) - 4} fill="rgba(255,255,255,0.45)" fontSize="8">
          Avg {Math.round(avg).toLocaleString()}
        </text>
      </>}
      <polyline points={linePts} fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      {values.map((v, i) => {
        const cx = xAt(i), cy = yAt(v)
        const label = v > 0 ? Math.round(v).toLocaleString() : '0'
        const isFirst = i === 0, isLast = i === values.length - 1
        const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
        return (
          <g key={i}>
            <text x={cx} y={cy - 7} textAnchor={anchor} fill="white" fontSize="8.5" fontWeight="600">{label}</text>
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
