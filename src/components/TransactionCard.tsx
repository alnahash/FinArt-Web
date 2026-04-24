import { format } from 'date-fns'
import type { Transaction } from '../types'
import { fmt } from '../lib/currency'

const CATEGORY_EMOJI: Record<string, string> = {
  'INCOME': '💰', 'FIXED BILLS': '📋', 'ANNUAL': '📅', 'FAMILY': '👨‍👩‍👧‍👦',
  'FOOD': '🍽️', 'TRANSPORT': '🚗', 'LIFESTYLE': '✨', 'FINANCIAL': '💳',
  'Salary': '💰', 'Rental income': '🏠', 'Other income': '💵',
  'Telecom': '📱', 'Utilities': '💡', 'House help': '🏡', 'Monthly subscriptions': '📦',
  'Insurance': '🛡️', 'Annual subscriptions': '🔄', 'Government fees': '🏛️',
  'School fees': '🏫', 'Gifts & occasions': '🎁',
  'Groceries': '🛒', 'Dining out': '🍽️', 'Coffee shop': '☕',
  'Fuel': '⛽', 'Car service': '🔧', 'Health': '🏥',
  'Shopping': '🛍️', 'SPA & wellness': '💆', 'Travel': '✈️',
  'Savings transfer': '🏦', 'Investment': '📈',
}

interface Props {
  tx: Transaction
  currency?: string
  hideAmounts?: boolean
  onClick?: () => void
  isSelected?: boolean
  onToggleSelect?: () => void
  showCheckbox?: boolean
}

export default function TransactionCard({ tx, currency = 'BHD', hideAmounts = false, onClick, isSelected = false, onToggleSelect, showCheckbox = false }: Props) {
  const emoji = tx.category ? (tx.category.icon || (CATEGORY_EMOJI[tx.category.name] ?? '💬')) : '💬'
  const color = tx.category?.color ?? '#6366f1'
  const title = tx.merchant || tx.bank_name || 'Transaction'
  const sub = tx.category?.name ?? (tx.account_number ? `A/C ${tx.account_number}` : 'Uncategorised')
  const amountStr = hideAmounts ? '••••' : fmt(tx.amount, currency)

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left ${isSelected ? 'bg-indigo-500/10' : ''}`}
    >
      {showCheckbox && (
        <input type="checkbox" checked={isSelected} onChange={onToggleSelect}
          onClick={e => e.stopPropagation()}
          className="w-4 h-4 cursor-pointer flex-shrink-0" />
      )}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: color + '33', border: `1.5px solid ${color}55` }}
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">{title}</p>
        <p className="text-xs text-slate-400 truncate">{sub}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${tx.type === 'debit' ? 'text-red-400' : 'text-green-400'}`}>
          {tx.type === 'debit' ? '−' : '+'}{amountStr}
        </p>
        <p className="text-xs text-slate-500">
          {format(new Date(tx.transaction_date), 'd MMM')}
        </p>
      </div>
    </button>
  )
}
