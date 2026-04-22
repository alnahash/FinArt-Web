import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { getCategories, getCategorySpending, upsertBudget, getBudgets } from '../services/db'
import type { Category, CategorySpending } from '../types'

export default function BudgetPage() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [categories, setCategories] = useState<Category[]>([])
  const [spending, setSpending] = useState<CategorySpending[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data: cats } = await getCategories(user.id)
    const allCats = cats ?? []
    setCategories(allCats)
    const sp = await getCategorySpending(user.id, month, year, allCats)
    // Merge categories that have no spending but have budgets
    const { data: budgets } = await getBudgets(user.id, month, year)
    const budgetMap: Record<string, number> = {}
    for (const b of budgets ?? []) {
      if (b.category_id) budgetMap[b.category_id] = b.amount
    }
    // Build full list: all categories with their spending/budget
    const spMap = Object.fromEntries(sp.map(s => [s.category.id, s]))
    const full: CategorySpending[] = allCats.map(cat => {
      if (spMap[cat.id]) return spMap[cat.id]
      const budget = budgetMap[cat.id] ?? cat.budget_limit ?? 0
      return { category: cat, spent: 0, budget, percentage: 0 }
    })
    setSpending(full)
    setLoading(false)
  }, [user, month, year])

  useEffect(() => { loadData() }, [loadData])

  const totalBudget = spending.reduce((s, c) => s + c.budget, 0)
  const totalSpent = spending.reduce((s, c) => s + c.spent, 0)
  const overallPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0

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

      {/* Overall progress */}
      {!loading && totalBudget > 0 && (
        <div className="card space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-medium">Overall Budget</span>
            <span className="text-slate-400">
              ₹{totalSpent.toLocaleString('en-IN')} / ₹{totalBudget.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallPct >= 90 ? 'bg-red-500' : overallPct >= 70 ? 'bg-yellow-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 text-right">{overallPct.toFixed(0)}% used</p>
        </div>
      )}

      {/* Category budgets */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-20 animate-pulse bg-slate-700" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {spending.map(cs => (
            <div key={cs.category.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cs.category.color }}
                  />
                  <span className="text-sm font-medium text-slate-200">{cs.category.name}</span>
                </div>
                <button
                  className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-colors"
                  onClick={() => {
                    setEditingId(cs.category.id)
                    setEditValue(String(cs.budget || ''))
                  }}
                >
                  ✏️ Edit
                </button>
              </div>

              {editingId === cs.category.id ? (
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm py-1.5"
                    type="number"
                    placeholder="Budget amount"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    autoFocus
                  />
                  <button
                    className="btn-primary text-sm px-3 py-1.5"
                    onClick={() => handleSaveBudget(cs.category.id)}
                    disabled={saving}
                  >
                    {saving ? '…' : 'Save'}
                  </button>
                  <button className="btn-ghost text-sm px-2" onClick={() => setEditingId(null)}>✕</button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Spent: ₹{cs.spent.toLocaleString('en-IN')}</span>
                    <span>{cs.budget > 0 ? `Budget: ₹${cs.budget.toLocaleString('en-IN')}` : 'No budget set'}</span>
                  </div>
                  {cs.budget > 0 && (
                    <>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            cs.percentage >= 90 ? 'bg-red-500' : cs.percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${cs.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-right" style={{
                        color: cs.percentage >= 90 ? '#f87171' : cs.percentage >= 70 ? '#facc15' : '#94a3b8'
                      }}>
                        {cs.percentage.toFixed(0)}%
                        {cs.percentage >= 90 && ' ⚠️ Near limit'}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
