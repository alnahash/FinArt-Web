import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { getCategories, getCategorySpending, upsertBudget, getBudgets, buildCategoryTree } from '../services/db'
import type { Category, CategorySpending, CategoryGroup } from '../types'

export default function BudgetPage() {
  const { user } = useAuth()
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
    // Merge in categories that have no activity but have budget limits
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

  // Aggregate group totals
  const getGroupTotals = (groupId: string) => {
    const children = spending.filter(s => s.category.parent_id === groupId)
    return {
      spent: children.reduce((s, c) => s + c.spent, 0),
      budget: children.reduce((s, c) => s + c.budget, 0),
      count: children.filter(c => c.spent > 0 || c.budget > 0).length,
    }
  }

  const totalIncome = spending.filter(s => s.isIncome).reduce((s, c) => s + c.spent, 0)
  const totalExpenses = spending.filter(s => !s.isIncome).reduce((s, c) => s + c.spent, 0)
  const totalBudget = spending.filter(s => !s.isIncome).reduce((s, c) => s + c.budget, 0)

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

      {/* Summary bar */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <SummaryChip label="Income" value={totalIncome} color="text-green-400" />
          <SummaryChip label="Spent" value={totalExpenses} color="text-red-400" />
          <SummaryChip
            label={totalBudget > 0 ? `${Math.round((totalExpenses / totalBudget) * 100)}% used` : 'No budget'}
            value={totalBudget - totalExpenses}
            color={totalBudget - totalExpenses >= 0 ? 'text-indigo-400' : 'text-red-400'}
          />
        </div>
      )}

      {/* Category groups */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-700" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {tree.map(({ group, children }) => {
            const totals = getGroupTotals(group.id)
            const isOpen = !collapsed[group.id]
            const activeChildren = spending.filter(s => s.category.parent_id === group.id)
            const groupPct = totals.budget > 0 ? Math.min((totals.spent / totals.budget) * 100, 100) : 0
            const isIncomeGroup = children.some(c => c.is_income)

            return (
              <div key={group.id} className="card !p-0 overflow-hidden">
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/40 transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="font-semibold text-sm text-slate-100 flex-1 text-left tracking-wide">
                    {group.name}
                  </span>
                  {totals.spent > 0 || totals.budget > 0 ? (
                    <span className={`text-xs font-medium ${isIncomeGroup ? 'text-green-400' : 'text-slate-300'}`}>
                      {isIncomeGroup ? '+' : ''}₹{totals.spent.toLocaleString('en-IN')}
                      {totals.budget > 0 && (
                        <span className="text-slate-500"> / ₹{totals.budget.toLocaleString('en-IN')}</span>
                      )}
                    </span>
                  ) : null}
                  <span className="text-slate-500 text-sm ml-1">{isOpen ? '▾' : '›'}</span>
                </button>

                {/* Group progress bar (only if has budget) */}
                {totals.budget > 0 && !isIncomeGroup && (
                  <div className="h-1 bg-slate-700 mx-3 mb-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${groupPct >= 90 ? 'bg-red-500' : groupPct >= 70 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                      style={{ width: `${groupPct}%` }}
                    />
                  </div>
                )}

                {/* Sub-categories */}
                {isOpen && (
                  <div className="border-t border-slate-700/60">
                    {children.map(cat => {
                      const cs = activeChildren.find(s => s.category.id === cat.id)
                      const spent = cs?.spent ?? 0
                      const budget = cs?.budget ?? 0
                      const pct = cs?.percentage ?? 0

                      return (
                        <div key={cat.id} className="px-4 py-2.5 border-b border-slate-700/30 last:border-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-sm text-slate-200 truncate">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs ${cat.is_income ? 'text-green-400' : 'text-slate-300'}`}>
                                {cat.is_income ? '+' : ''}₹{spent.toLocaleString('en-IN')}
                                {budget > 0 && <span className="text-slate-500"> / ₹{budget.toLocaleString('en-IN')}</span>}
                              </span>
                              {editingId === cat.id ? (
                                <>
                                  <input
                                    className="w-20 bg-slate-600 border border-slate-500 rounded-lg px-2 py-1 text-xs text-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    type="number"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveBudget(cat.id); if (e.key === 'Escape') setEditingId(null) }}
                                    autoFocus
                                  />
                                  <button onClick={() => handleSaveBudget(cat.id)} disabled={saving} className="text-xs text-indigo-400 hover:text-indigo-300">✓</button>
                                  <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-300">✕</button>
                                </>
                              ) : (
                                <button
                                  onClick={() => { setEditingId(cat.id); setEditValue(String(budget || '')) }}
                                  className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
                                  title="Set budget"
                                >
                                  ✏️
                                </button>
                              )}
                            </div>
                          </div>
                          {budget > 0 && !cat.is_income && (
                            <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SummaryChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card text-center py-3">
      <p className={`text-sm font-bold ${color} leading-tight`}>₹{Math.abs(value).toLocaleString('en-IN')}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  )
}
