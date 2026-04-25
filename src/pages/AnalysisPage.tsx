import { useState, useEffect, useMemo } from 'react'
import { subMonths, getYear, getMonth } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { getMonthlySummary, getCategorySpending, getCategories } from '../services/db'
import { fmt as fmtCurrency } from '../lib/currency'
import type { Category } from '../types'

export default function AnalysisPage() {
  const { user } = useAuth()
  const profile = useProfile()
  const currency = profile?.currency ?? 'BHD'
  const hideAmounts = profile?.hide_amounts ?? false
  const startDay = profile?.month_start_day ?? 1

  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<Array<{ month: number; year: number; income: number; expenses: number; savings: number }>>([])
  const [categoryBreakdown, setCategoryBreakdown] = useState<Array<{ name: string; amount: number; percentage: number }>>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [ytdStats, setYtdStats] = useState({ totalIncome: 0, totalExpenses: 0, totalSavings: 0, avgMonthlyExpenses: 0 })

  const now = new Date()
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i)
    return { month: getMonth(d) + 1, year: getYear(d) }
  })

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      try {
        const [catsRes] = await Promise.all([
          getCategories(user.id),
        ])

        const cats = catsRes.data ?? []
        setCategories(cats)

        const monthData: Array<{ month: number; year: number; income: number; expenses: number; savings: number }> = []
        let ytdIncome = 0
        let ytdExpenses = 0

        for (const { month, year } of months) {
          const summary = await getMonthlySummary(user.id, month, year, startDay)
          monthData.push({
            month,
            year,
            income: summary.totalCredit,
            expenses: summary.totalDebit,
            savings: summary.netSavings
          })
          ytdIncome += summary.totalCredit
          ytdExpenses += summary.totalDebit
        }

        setMonthlyData(monthData)

        // Get category spending for all months (YTD), not just current month
        let allCatSpending: { [key: string]: { name: string; spent: number } } = {}
        for (const { month, year } of months) {
          const catSpend = await getCategorySpending(user.id, month, year, cats, startDay)
          catSpend?.forEach((cs: any) => {
            if (!cs.isIncome && (cs.spent ?? 0) > 0) {
              if (!allCatSpending[cs.category.id]) {
                allCatSpending[cs.category.id] = { name: cs.category.name, spent: 0 }
              }
              allCatSpending[cs.category.id].spent += cs.spent ?? 0
            }
          })
        }

        const breakdown = Object.values(allCatSpending)
          .sort((a, b) => b.spent - a.spent)
          .slice(0, 8)

        const totalCatSpending = breakdown.reduce((s, c) => s + c.spent, 0)
        setCategoryBreakdown(
          breakdown.map(c => ({
            name: c.name,
            amount: c.spent,
            percentage: totalCatSpending > 0 ? (c.spent / totalCatSpending) * 100 : 0
          }))
        )

        const avgMonthly = monthData.length > 0 ? ytdExpenses / monthData.length : 0
        setYtdStats({
          totalIncome: ytdIncome,
          totalExpenses: ytdExpenses,
          totalSavings: ytdIncome - ytdExpenses,
          avgMonthlyExpenses: avgMonthly
        })
      } catch (err) {
        console.error('Failed to load analysis data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, startDay])

  const display = (amount: number) => hideAmounts ? '••••' : fmtCurrency(amount, currency)

  // AI-powered spending analysis and suggestions
  const generateSuggestions = useMemo(() => {
    const suggestions: Array<{ emoji: string; title: string; description: string; savingsPerMonth: number }> = []

    if (categoryBreakdown.length === 0) return suggestions

    const avgCategorySpending = ytdStats.totalExpenses / Math.max(categoryBreakdown.length, 1)

    categoryBreakdown.slice(0, 5).forEach(cat => {
      const categoryName = cat.name.toLowerCase()
      let suggestion: { emoji: string; title: string; description: string; savings: number } | null = null

      // Coffee & Cafes
      if (categoryName.includes('coffee') || categoryName.includes('cafe') || categoryName.includes('starbucks')) {
        const monthlySpend = cat.amount / 12
        if (monthlySpend > 100) {
          suggestion = {
            emoji: '☕',
            title: 'Reduce Coffee Shop Visits',
            description: `You spend ${fmtCurrency(monthlySpend, currency)}/month on coffee. Making coffee at home costs ~${fmtCurrency(monthlySpend * 0.3, currency)}/month. Save ${fmtCurrency(monthlySpend * 0.7, currency)}/month!`,
            savings: monthlySpend * 0.7
          }
        }
      }

      // Food & Restaurants
      if (categoryName.includes('restaurant') || categoryName.includes('food') || categoryName.includes('dining') || categoryName.includes('takeout')) {
        const monthlySpend = cat.amount / 12
        if (monthlySpend > 500) {
          suggestion = {
            emoji: '🍽️',
            title: 'Cook More at Home',
            description: `Restaurant spending: ${fmtCurrency(monthlySpend, currency)}/month. Cooking at home could save ~50%. Potential savings: ${fmtCurrency(monthlySpend * 0.5, currency)}/month!`,
            savings: monthlySpend * 0.5
          }
        }
      }

      // Shopping & Retail
      if (categoryName.includes('shopping') || categoryName.includes('retail') || categoryName.includes('mall')) {
        const monthlySpend = cat.amount / 12
        if (monthlySpend > 300) {
          suggestion = {
            emoji: '🛍️',
            title: 'Smart Shopping Strategy',
            description: `Monthly shopping: ${fmtCurrency(monthlySpend, currency)}. Try the 30-day rule: wait 30 days before non-essential purchases. Save ~${fmtCurrency(monthlySpend * 0.3, currency)}/month!`,
            savings: monthlySpend * 0.3
          }
        }
      }

      // Entertainment & Subscriptions
      if (categoryName.includes('entertainment') || categoryName.includes('movies') || categoryName.includes('subscription')) {
        const monthlySpend = cat.amount / 12
        if (monthlySpend > 150) {
          suggestion = {
            emoji: '🎬',
            title: 'Review Subscriptions',
            description: `Entertainment spending: ${fmtCurrency(monthlySpend, currency)}/month. Cancel unused subscriptions. Potential savings: ${fmtCurrency(monthlySpend * 0.4, currency)}/month!`,
            savings: monthlySpend * 0.4
          }
        }
      }

      // Travel & Transport
      if (categoryName.includes('travel') || categoryName.includes('uber') || categoryName.includes('taxi') || categoryName.includes('transport')) {
        const monthlySpend = cat.amount / 12
        if (monthlySpend > 200) {
          suggestion = {
            emoji: '🚗',
            title: 'Optimize Travel',
            description: `Travel costs: ${fmtCurrency(monthlySpend, currency)}/month. Use public transport or carpool more. Save ~${fmtCurrency(monthlySpend * 0.4, currency)}/month!`,
            savings: monthlySpend * 0.4
          }
        }
      }

      // Utilities & Services
      if (categoryName.includes('utility') || categoryName.includes('electricity') || categoryName.includes('water') || categoryName.includes('internet')) {
        const monthlySpend = cat.amount / 12
        if (monthlySpend > 150) {
          suggestion = {
            emoji: '💡',
            title: 'Reduce Utility Costs',
            description: `Utilities: ${fmtCurrency(monthlySpend, currency)}/month. Energy efficiency improvements can save ~${fmtCurrency(monthlySpend * 0.2, currency)}/month!`,
            savings: monthlySpend * 0.2
          }
        }
      }

      // General high spending
      if (!suggestion && cat.percentage > 15) {
        const monthlySpend = cat.amount / 12
        suggestion = {
          emoji: '💰',
          title: `Review ${cat.name}`,
          description: `${cat.name} is ${cat.percentage.toFixed(1)}% of your spending. Review if this aligns with your goals. Reduce by 20%? Save ${fmtCurrency(monthlySpend * 0.2, currency)}/month!`,
          savings: monthlySpend * 0.2
        }
      }

      if (suggestion) {
        suggestions.push({
          emoji: suggestion.emoji,
          title: suggestion.title,
          description: suggestion.description,
          savingsPerMonth: suggestion.savings
        })
      }
    })

    return suggestions.sort((a, b) => b.savingsPerMonth - a.savingsPerMonth)
  }, [categoryBreakdown, ytdStats, currency])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const maxExpense = Math.max(...monthlyData.map(m => m.expenses), 1)

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Analysis</h1>
        <p className="text-secondary text-sm">Financial insights & trends</p>
      </div>

      {/* YTD Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-secondary uppercase font-semibold mb-2">Total Income</div>
          <div className="text-2xl font-bold text-emerald-400">{display(ytdStats.totalIncome)}</div>
          <div className="text-xs text-secondary mt-2">Last 12 months</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-secondary uppercase font-semibold mb-2">Total Expenses</div>
          <div className="text-2xl font-bold text-red-400">{display(ytdStats.totalExpenses)}</div>
          <div className="text-xs text-secondary mt-2">Last 12 months</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-secondary uppercase font-semibold mb-2">Net Savings</div>
          <div className={`text-2xl font-bold ${ytdStats.totalSavings >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            {display(ytdStats.totalSavings)}
          </div>
          <div className="text-xs text-secondary mt-2">Last 12 months</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-secondary uppercase font-semibold mb-2">Avg Monthly</div>
          <div className="text-2xl font-bold text-amber-400">{display(ytdStats.avgMonthlyExpenses)}</div>
          <div className="text-xs text-secondary mt-2">Spending</div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-surface rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-primary mb-4">Monthly Trend (Last 12 Months)</h2>
        <div className="space-y-3">
          {monthlyData.map((month, idx) => {
            const monthLabel = new Date(month.year, month.month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            const barHeight = month.expenses > 0 ? (month.expenses / maxExpense) * 100 : 0
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary w-12">{monthLabel}</span>
                  <div className="flex-1 mx-4 bg-slate-800 rounded-full h-6 overflow-hidden relative">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-full transition-all"
                      style={{ width: `${barHeight}%` }}
                    />
                  </div>
                  <span className="text-primary font-semibold text-right w-32">{display(month.expenses)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Income vs Expenses Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-primary mb-4">Income vs Expenses</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-secondary text-sm">Income</span>
                <span className="text-emerald-400 font-semibold">{display(ytdStats.totalIncome)}</span>
              </div>
              <div className="bg-slate-800 rounded-full h-3 overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-secondary text-sm">Expenses</span>
                <span className="text-red-400 font-semibold">{display(ytdStats.totalExpenses)}</span>
              </div>
              <div className="bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-red-500 h-full"
                  style={{ width: ytdStats.totalIncome > 0 ? `${(ytdStats.totalExpenses / ytdStats.totalIncome) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-secondary text-sm">Savings</span>
                <span className={`font-semibold ${ytdStats.totalSavings >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{display(ytdStats.totalSavings)}</span>
              </div>
              <div className="bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${ytdStats.totalSavings >= 0 ? 'bg-cyan-500' : 'bg-red-500'}`}
                  style={{ width: ytdStats.totalIncome > 0 ? `${(ytdStats.totalSavings / ytdStats.totalIncome) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="text-sm text-secondary mb-1">Savings Rate</div>
            <div className="text-3xl font-bold text-cyan-400">
              {ytdStats.totalIncome > 0 ? ((ytdStats.totalSavings / ytdStats.totalIncome) * 100).toFixed(1) : '0'}%
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-surface rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-primary mb-4">Top Spending Categories</h2>
          <div className="space-y-3">
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((cat, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-secondary text-sm">{cat.name}</span>
                    <span className="text-primary font-semibold text-sm">{cat.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-full"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-secondary mt-1">{display(cat.amount)}</div>
                </div>
              ))
            ) : (
              <p className="text-secondary text-sm">No spending data available</p>
            )}
          </div>
        </div>
      </div>

      {/* AI-Powered Suggestions */}
      {generateSuggestions.length > 0 && (
        <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 rounded-lg p-6 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <h2 className="text-lg font-bold text-primary">AI Spending Suggestions</h2>
          </div>
          <p className="text-secondary text-sm mb-4">Based on your spending patterns, here are personalized ways to save money:</p>
          <div className="space-y-3">
            {generateSuggestions.map((suggestion, idx) => (
              <div key={idx} className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50 hover:border-purple-500/50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{suggestion.emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary mb-1">{suggestion.title}</h3>
                    <p className="text-secondary text-sm mb-2">{suggestion.description}</p>
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                      <span>💚</span>
                      <span>Potential savings: {display(suggestion.savingsPerMonth)}/month</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {generateSuggestions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-sm text-secondary">
                <span className="font-semibold text-cyan-400">Total potential savings: </span>
                {display(generateSuggestions.reduce((sum, s) => sum + s.savingsPerMonth, 0))}/month
              </div>
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      <div className="bg-surface rounded-lg p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-primary mb-4">Key Insights</h2>
        <div className="space-y-3">
          {ytdStats.totalIncome > 0 && (
            <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg border border-slate-600">
              <span className="text-lg">💡</span>
              <div>
                <div className="text-sm font-semibold text-primary">Savings Rate</div>
                <div className="text-xs text-secondary">You're saving {((ytdStats.totalSavings / ytdStats.totalIncome) * 100).toFixed(1)}% of your income</div>
              </div>
            </div>
          )}
          {monthlyData.length > 1 && (
            <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg border border-slate-600">
              <span className="text-lg">📊</span>
              <div>
                <div className="text-sm font-semibold text-primary">Average Monthly Spending</div>
                <div className="text-xs text-secondary">{display(ytdStats.avgMonthlyExpenses)} per month</div>
              </div>
            </div>
          )}
          {categoryBreakdown.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-slate-900 rounded-lg border border-slate-600">
              <span className="text-lg">🎯</span>
              <div>
                <div className="text-sm font-semibold text-primary">Top Category</div>
                <div className="text-xs text-secondary">{categoryBreakdown[0]?.name} accounts for {categoryBreakdown[0]?.percentage.toFixed(1)}% of spending</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
