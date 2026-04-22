import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { getCategories, getCategorySpending, upsertBudget, getBudgets, buildCategoryTree } from '../services/db'
import { fmt as fmtCurrency } from '../lib/currency'
import type { CategorySpending, CategoryGroup } from '../types'

export default function BudgetPage() {
  const { user } = useAuth()
  const profile = useProfile()
  const currency = profile?.currency ?? 'BHD'

  const [currentDate, setCurrentDate] = useState(new Date())
  const [tree, setTree] = useState<CategoryGroup[]>([])
  const [spending, setSpending] = useState<CategorySpending[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: cats } = await getCategories(user.id)
    const allCats = cats ?? []
    setTree(buildCategoryTree(allCats))
    const sp = await getCategorySpending(user.id, month, year, allCats)
    const { data: budgets } = await getBudgets(user.id, month, year)
    const budgetMap: Record<string, number> = {}
    for (const b of budgets ?? []) if (b.category_id) budgetMap[b.category_id] = b.amount
    const spMap = Object.fromEntries(sp.map(s => [s.category.id, s]))
    const full: CategorySpending[] = allCats
      .filter(c => c.parent_id !== null)
      .map(cat => spMap[cat.id] ?? {
        category: cat,
        spent: 0,
        budget: budgetMap[cat.id] ?? cat.budget_limit ?? 0,
        isIncome: cat.is_income,
        percentage: 0,
      })
    setSpending(full)
    setLoading(false)
  }, [user, month, year])

  useEffect(() => { loadData() }, [loadData])

  const handleSaveBudget = async (catId: string) => {
    if (!user) return
    const amt = Number(editValue)
    if (isNaN(amt) || amt < 0) return
    setSaving(true)
    await upsertBudget(user.id, catId, month, year, amt)
    setSaving(false)
    setEditingId(null)
    await loadData()
  }

  const toggleGroup = (id: string) => setCollapsed(p => ({ ...p, [id]: !p[id] }))

  const getGroupTotals = (groupId: string) => {
    const children = spending.filter(s => s.category.parent_id === groupId)
    return {
      spent: children.reduce((s, c) => s + c.spent, 0),
      budget: children.reduce((s, c) => s + c.budget, 0),
    }
  }

  const totalIncome = spending.filter(s => s.isIncome).reduce((s, c) => s + c.spent, 0)
  const totalExpenses = spending.filter(s => !s.isIncome).reduce((s, c) => s + c.spent, 0)
  const totalBudget = spending.filter(s => !s.isIncome).reduce((s, c) => s + c.budget, 0)

  if (loading) return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-28 rounded-2xl animate-pulse bg-slate-800" />
      ))}
    </div>
  )

  return (
    <div className="p-4 space-y-4">

      {/* Month selector */}
      <div className="flex items-center justify-between">
        <button className="btn-ghost text-xl" onClick={() => setCurrentDate(d => subMonths(d, 1))}>‹</button>
        <h2 className="font-semibold text-slate-200">{format(currentDate, 'MMMM yyyy')}</h2>
        <button
          className="btn-ghost text-xl"
          onClick={() => setCurrentDate(d => addMonths(d, 1))}
          disabled={format(currentDate, 'MM/yyyy') === format(new Date(), 'MM/yyyy')}
        >›</button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryChip label="Income" value={fmtCurrency(totalIncome, currency)} color="text-green-400" accent="border-green-500/30" />
        <SummaryChip label="Spent" value={fmtCurrency(totalExpenses, currency)} color="text-red-400" accent="border-red-500/30" />
        <SummaryChip
          label={totalBudget > 0 ? `${Math.round((totalExpenses / totalBudget) * 100)}% used` : 'No budget'}
          value={fmtCurrency(Math.abs(totalBudget - totalExpenses), currency)}
          color={totalBudget - totalExpenses >= 0 ? 'text-indigo-400' : 'text-red-400'}
          accent="border-indigo-500/30"
        />
      </div>

      {/* Category groups */}
      <div className="space-y-3">
        {tree.map(({ group, children }) => {
          const totals = getGroupTotals(group.id)
          const isOpen = !collapsed[group.id]
          const activeChildren = spending.filter(s => s.category.parent_id === group.id)
          const isIncomeGroup = children.some(c => c.is_income)
          const groupPct = totals.budget > 0 ? Math.min((totals.spent / totals.budget) * 100, 100) : 0

          return (
            <div key={group.id} className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-800/40">

              {/* ── Group Header ── */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-700/30 transition-colors"
                style={{ borderLeft: `4px solid ${group.color}` }}
              >
                {/* Color dot + name */}
                <div className="flex-1 flex items-center gap-2.5 min-w-0 text-left">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="font-bold text-sm text-slate-100 tracking-wide uppercase">{group.name}</span>
                  <span className="text-xs text-slate-500 font-normal normal-case">({children.length})</span>
                </div>

                {/* Group total */}
                <div className="text-right flex-shrink-0">
                  {(totals.spent > 0 || totals.budget > 0) && (
                    <>
                      <p className={`text-sm font-semibold ${isIncomeGroup ? 'text-green-400' : 'text-slate-200'}`}>
                        {isIncomeGroup ? '+' : ''}{fmtCurrency(totals.spent, currency)}
                      </p>
                      {totals.budget > 0 && !isIncomeGroup && (
                        <p className="text-xs text-slate-500">of {fmtCurrency(totals.budget, currency)}</p>
                      )}
                    </>
                  )}
                </div>
                <span className="text-slate-500 text-sm ml-1 flex-shrink-0">{isOpen ? '▾' : '›'}</span>
              </button>

              {/* Group progress bar */}
              {totals.budget > 0 && !isIncomeGroup && (
                <div className="h-1.5 bg-slate-700 mx-4 rounded-full overflow-hidden -mt-1 mb-1">
                  <div
                    className={`h-full rounded-full transition-all ${groupPct >= 90 ? 'bg-red-500' : groupPct >= 70 ? 'bg-yellow-400' : 'bg-indigo-500'}`}
                    style={{ width: `${groupPct}%` }}
                  />
                </div>
              )}

              {/* ── Sub-categories ── */}
              {isOpen && children.length > 0 && (
                <div className="border-t border-slate-700/50">
                  {children.map((cat, idx) => {
                    const cs = activeChildren.find(s => s.category.id === cat.id)
                    const spent = cs?.spent ?? 0
                    const budget = cs?.budget ?? 0
                    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
                    const isLast = idx === children.length - 1

                    return (
                      <div
                        key={cat.id}
                        className={`px-4 py-3 ${!isLast ? 'border-b border-slate-700/30' : ''} bg-slate-900/20`}
                      >
                        {/* Sub-cat name row */}
                        <div className="flex items-center gap-2 mb-1.5">
                          {/* Indent + color indicator */}
                          <span className="w-5 flex-shrink-0" />
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-sm text-slate-200 flex-1 font-medium">{cat.name}</span>

                          {/* Amount + edit */}
                          {editingId === cat.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                className="w-24 bg-slate-700 border border-slate-500 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                type="number"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveBudget(cat.id)
                                  if (e.key === 'Escape') setEditingId(null)
                                }}
                                autoFocus
                              />
                              <button onClick={() => handleSaveBudget(cat.id)} disabled={saving}
                                className="text-xs text-green-400 hover:text-green-300 font-bold px-1">✓</button>
                              <button onClick={() => setEditingId(null)}
                                className="text-xs text-slate-500 hover:text-slate-300 px-1">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className={`text-sm font-medium ${cat.is_income ? 'text-green-400' : spent > 0 ? 'text-slate-100' : 'text-slate-500'}`}>
                                  {cat.is_income ? '+' : ''}{fmtCurrency(spent, currency)}
                                </span>
                                {budget > 0 && (
                                  <span className="text-slate-500 text-xs ml-1">/ {fmtCurrency(budget, currency)}</span>
                                )}
                              </div>
                              <button
                                onClick={() => { setEditingId(cat.id); setEditValue(String(budget || '')) }}
                                className="text-slate-600 hover:text-purple-400 transition-colors text-sm"
                                title="Set budget"
                              >✏️</button>
                            </div>
                          )}
                        </div>

                        {/* Sub-cat progress bar */}
                        {budget > 0 && !cat.is_income && (
                          <div className="ml-9 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {isOpen && children.length === 0 && (
                <p className="px-4 py-3 text-xs text-slate-500 border-t border-slate-700/50">No sub-categories</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryChip({ label, value, color, accent }: { label: string; value: string; color: string; accent: string }) {
  return (
    <div className={`rounded-xl bg-slate-800/60 border ${accent} px-3 py-2.5 text-center`}>
      <p className={`text-sm font-bold ${color} leading-tight truncate`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
