import { useState } from 'react'
import { upsertBudget } from '../../services/db'
import type { Category } from '../../types'

interface Step4BudgetAllocationProps {
  categories: Category[]
  userId: string
  onNext: () => void
}

export default function Step4BudgetAllocation({
  categories,
  userId,
  onNext,
}: Step4BudgetAllocationProps) {
  const [loading, setLoading] = useState(false)
  const [budgets, setBudgets] = useState<Record<string, number>>({})

  // Get main expense categories only (no parent_id, not income)
  const expenseCategories = categories.filter(c => !c.parent_id && !c.is_income)

  // Get current month/year
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const handleBudgetChange = (categoryId: string, amount: number) => {
    setBudgets(prev => ({
      ...prev,
      [categoryId]: amount,
    }))
  }

  const handleNext = async () => {
    try {
      setLoading(true)

      // Save budgets for all categories with values > 0
      const budgetUpdates = Object.entries(budgets)
        .filter(([, amount]) => amount > 0)
        .map(([categoryId, amount]) =>
          upsertBudget(userId, categoryId, currentMonth, currentYear, amount)
        )

      if (budgetUpdates.length > 0) {
        await Promise.all(budgetUpdates)
      }

      onNext()
    } catch (err) {
      console.error('Failed to save budgets:', err)
    } finally {
      setLoading(false)
    }
  }

  const totalBudget = Object.values(budgets).reduce((sum, val) => sum + val, 0)

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Allocate your monthly budget across categories. Leave blank to skip.
      </p>

      {/* Budget Inputs */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {expenseCategories.map(category => (
          <div key={category.id}>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color || '#6366f1' }}
              />
              <label className="text-sm font-medium text-slate-300 flex-1">
                {category.name}
              </label>
            </div>
            <input
              type="number"
              min="0"
              step="50"
              value={budgets[category.id] || ''}
              onChange={e => handleBudgetChange(category.id, parseFloat(e.target.value) || 0)}
              disabled={loading}
              placeholder="0"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm hover:border-slate-500 transition-colors disabled:opacity-50"
            />
          </div>
        ))}
      </div>

      {/* Total Summary */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Total Allocated:</span>
          <span className="text-lg font-semibold text-indigo-400">
            {totalBudget.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
        <p className="text-xs text-slate-400">
          💡 <strong>Tip:</strong> You can set budgets for all categories, or focus on your top spending areas. You can edit these anytime.
        </p>
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={loading}
        className="btn-primary w-full mt-6"
      >
        {loading ? 'Saving...' : 'Continue →'}
      </button>
    </div>
  )
}
