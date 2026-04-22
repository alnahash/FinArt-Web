import { format } from 'date-fns'
import type { Transaction } from '../types'

const CATEGORY_EMOJI: Record<string, string> = {
  'Food & Dining': '🍔', 'Shopping': '🛍', 'Transport': '🚗', 'Utilities': '💡',
  'Entertainment': '🎬', 'Health': '🏥', 'Education': '📚', 'EMI/Loans': '🏦',
  'Investments': '📈', 'Others': '💼',
}

interface Props {
  tx: Transaction
  onClick?: () => void
}

export default function TransactionCard({ tx, onClick }: Props) {
  const emoji = tx.category ? (CATEGORY_EMOJI[tx.category.name] ?? '💼') : '💬'
  const color = tx.category?.color ?? '#6366f1'
  const title = tx.merchant || tx.bank_name || 'Transaction'
  const sub = tx.category?.name ?? (tx.account_number ? `A/C ${tx.account_number}` : 'Uncategorised')

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
    >
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
          {tx.type === 'debit' ? '−' : '+'}₹{Number(tx.amount).toLocaleString('en-IN')}
        </p>
        <p className="text-xs text-slate-500">
          {format(new Date(tx.transaction_date), 'd MMM')}
        </p>
      </div>
    </button>
  )
}
