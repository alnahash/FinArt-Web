import { useState } from 'react'
import { format } from 'date-fns'
import type { Transaction, Category } from '../types'
import { updateTransactionCategory, deleteTransaction } from '../services/db'

interface Props {
  tx: Transaction
  categories: Category[]
  onClose: () => void
  onUpdated: () => void
}

export default function TransactionDetailModal({ tx, categories, onClose, onUpdated }: Props) {
  const [selectedCat, setSelectedCat] = useState(tx.category_id ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSaveCat = async () => {
    setSaving(true)
    await updateTransactionCategory(tx.id, selectedCat || null)
    setSaving(false)
    onUpdated()
    onClose()
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    await deleteTransaction(tx.id)
    setDeleting(false)
    onUpdated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="font-bold text-lg">Transaction Detail</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Amount */}
          <div className="text-center py-2">
            <p className={`text-3xl font-bold ${tx.type === 'debit' ? 'text-red-400' : 'text-green-400'}`}>
              {tx.type === 'debit' ? '−' : '+'}₹{Number(tx.amount).toLocaleString('en-IN')}
            </p>
            <p className="text-slate-400 text-sm mt-1">{format(new Date(tx.transaction_date), 'dd MMM yyyy, hh:mm a')}</p>
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            {tx.merchant && <Row label="Merchant" value={tx.merchant} />}
            {tx.bank_name && <Row label="Bank" value={tx.bank_name} />}
            {tx.account_number && <Row label="Account" value={`A/C ${tx.account_number}`} />}
            {tx.balance_after != null && <Row label="Balance After" value={`₹${Number(tx.balance_after).toLocaleString('en-IN')}`} />}
            {tx.description && <Row label="Description" value={tx.description} />}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Category</label>
            <select className="input mt-1" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
              <option value="">Uncategorised</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn-primary w-full mt-2" onClick={handleSaveCat} disabled={saving}>
              {saving ? 'Saving…' : 'Update Category'}
            </button>
          </div>

          {/* SMS */}
          {tx.sms_body && (
            <details className="text-xs text-slate-400 bg-slate-700/50 rounded-xl p-3">
              <summary className="cursor-pointer font-medium text-slate-300">Original SMS</summary>
              <p className="mt-2 whitespace-pre-wrap">{tx.sms_body}</p>
            </details>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
              confirmDelete ? 'bg-red-500 text-white' : 'bg-slate-700 text-red-400 hover:bg-red-500/10'
            }`}
          >
            {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm delete' : 'Delete Transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100 text-right">{value}</span>
    </div>
  )
}
