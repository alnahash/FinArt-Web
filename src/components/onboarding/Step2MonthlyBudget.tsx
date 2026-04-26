import { useState } from 'react'
import { updateProfile } from '../../services/db'
import type { Profile } from '../../types'

interface Step2MonthlyBudgetProps {
  profile: Profile
  onUpdate: (updates: Partial<Profile>) => void
  onNext: () => void
}

export default function Step2MonthlyBudget({ profile, onUpdate, onNext }: Step2MonthlyBudgetProps) {
  const [monthlyBudget, setMonthlyBudget] = useState(profile.monthly_budget || 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNext = async () => {
    try {
      setError('')
      setLoading(true)

      if (monthlyBudget <= 0) {
        setError('Monthly budget must be greater than 0')
        return
      }

      // Update profile
      const { error: err } = await updateProfile(profile.id, {
        monthly_budget: monthlyBudget,
      })
      if (err) throw err

      onUpdate({ monthly_budget: monthlyBudget })
      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update budget')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSet = (amount: number) => {
    setMonthlyBudget(amount)
  }

  return (
    <div className="space-y-4">
      {/* Budget Input */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Monthly Spending Budget ({profile.currency})
        </label>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-lg">{profile.currency}</span>
          <input
            type="number"
            min="0"
            step="100"
            value={monthlyBudget}
            onChange={e => setMonthlyBudget(parseFloat(e.target.value) || 0)}
            disabled={loading}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-50 text-lg"
            placeholder="0"
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          This is your target monthly spending limit. You can adjust category budgets in the next step.
        </p>
      </div>

      {/* Quick Set Buttons */}
      <div>
        <p className="text-xs text-slate-400 mb-2">Quick set:</p>
        <div className="grid grid-cols-2 gap-2">
          {[2000, 5000, 10000, 20000].map(amount => (
            <button
              key={amount}
              onClick={() => handleQuickSet(amount)}
              disabled={loading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 text-sm transition-colors disabled:opacity-50"
            >
              {profile.currency} {amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
        <p className="text-xs text-slate-400">
          💡 <strong>Tip:</strong> Set this to your average monthly income. You'll allocate it across specific categories next.
        </p>
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        disabled={loading || monthlyBudget <= 0}
        className="btn-primary w-full mt-6"
      >
        {loading ? 'Saving...' : 'Continue →'}
      </button>
    </div>
  )
}
