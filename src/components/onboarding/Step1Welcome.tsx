import { useState } from 'react'
import { updateProfile } from '../../services/db'
import type { Profile } from '../../types'

interface Step1WelcomeProps {
  profile: Profile
  onUpdate: (updates: Partial<Profile>) => void
  onNext: () => void
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'INR', 'BHD', 'AED']

export default function Step1Welcome({ profile, onUpdate, onNext }: Step1WelcomeProps) {
  const [currency, setCurrency] = useState(profile.currency)
  const [monthStartDay, setMonthStartDay] = useState(profile.month_start_day || 1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNext = async () => {
    try {
      setError('')
      setLoading(true)

      if (monthStartDay < 1 || monthStartDay > 28) {
        setError('Month start day must be between 1 and 28')
        return
      }

      // Update profile if currency or month_start_day changed
      if (currency !== profile.currency || monthStartDay !== profile.month_start_day) {
        const { error: err } = await updateProfile(profile.id, {
          currency,
          month_start_day: monthStartDay,
        })
        if (err) throw err
        onUpdate({ currency, month_start_day: monthStartDay })
      }

      onNext()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Name Display */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Full Name
        </label>
        <input
          type="text"
          value={profile.full_name || ''}
          disabled
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
        />
        <p className="text-xs text-slate-500 mt-1">Confirmed at signup</p>
      </div>

      {/* Currency Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Currency
        </label>
        <select
          value={currency}
          onChange={e => setCurrency(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-50"
        >
          {CURRENCIES.map(curr => (
            <option key={curr} value={curr}>
              {curr}
            </option>
          ))}
        </select>
      </div>

      {/* Month Start Day */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Month Start Day (1-28)
        </label>
        <input
          type="number"
          min="1"
          max="28"
          value={monthStartDay}
          onChange={e => setMonthStartDay(parseInt(e.target.value) || 1)}
          disabled={loading}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 hover:border-slate-500 transition-colors disabled:opacity-50"
        />
        <p className="text-xs text-slate-500 mt-1">
          Your financial month will start on the {monthStartDay}th of each month
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Next Button (inside this component for demo) */}
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
