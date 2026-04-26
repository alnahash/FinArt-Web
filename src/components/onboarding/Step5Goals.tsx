import { useState } from 'react'
import { upsertBudget } from '../../services/db'
import type { Category } from '../../types'

interface Step5GoalsProps {
  categories: Category[]
  userId: string
}

export default function Step5Goals({ categories, userId }: Step5GoalsProps) {
  const [loading, setLoading] = useState(false)
  const [goals, setGoals] = useState<Record<string, number>>({})

  // Get main expense categories (top 5 by default)
  const expenseCategories = categories
    .filter(c => !c.parent_id && !c.is_income)
    .slice(0, 5)

  // Get current month/year
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const handleGoalChange = (categoryId: string, amount: number) => {
    setGoals(prev => ({
      ...prev,
      [categoryId]: amount,
    }))
  }

  const handleSaveGoals = async () => {
    try {
      setLoading(true)

      // Save goals as budget records
      const goalUpdates = Object.entries(goals)
        .filter(([, amount]) => amount > 0)
        .map(([categoryId, amount]) =>
          upsertBudget(userId, categoryId, currentMonth, currentYear, amount)
        )

      if (goalUpdates.length > 0) {
        await Promise.all(goalUpdates)
      }

      setLoading(false)
    } catch (err) {
      console.error('Failed to save goals:', err)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        (Optional) Set spending goals for your top categories. Leave blank to skip.
      </p>

      {/* Goal Inputs */}
      <div className="space-y-2">
        {expenseCategories.map(category => (
          <div key={category.id}>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color || '#6366f1' }}
              />
              <label className="text-sm font-medium text-slate-300 flex-1">
                {category.name} Goal
              </label>
            </div>
            <input
              type="number"
              min="0"
              step="50"
              value={goals[category.id] || ''}
              onChange={e => handleGoalChange(category.id, parseFloat(e.target.value) || 0)}
              disabled={loading}
              placeholder="No goal"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm hover:border-slate-500 transition-colors disabled:opacity-50"
            />
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 space-y-2">
        <p className="text-xs text-slate-400">
          <strong>💡 What are goals?</strong> Unlike budgets, goals are targets you want to stay under. We'll track your progress and alert you if you're approaching the limit.
        </p>
        <p className="text-xs text-slate-400">
          You can set goals now or skip this step and configure them later in the budget section.
        </p>
      </div>

      {/* Complete Message */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-3 py-2">
        <p className="text-xs text-indigo-300">
          ✨ You're all set! Click "Complete Setup" to go to your dashboard and start tracking your finances.
        </p>
      </div>
    </div>
  )
}
