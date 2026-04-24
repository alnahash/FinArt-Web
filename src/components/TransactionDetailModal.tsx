import { useState } from 'react'
import { format } from 'date-fns'
import type { Transaction, Category } from '../types'
import { updateTransactionCategory, updateTransaction, deleteTransaction } from '../services/db'
import { fmt } from '../lib/currency'

interface Props {
  tx: Transaction
  categories: Category[]
  currency?: string
  hideAmounts?: boolean
  onClose: () => void
  onUpdated: () => void
}

export default function TransactionDetailModal({ tx, categories, currency = 'BHD', hideAmounts = false, onClose, onUpdated }: Props) {
  const [selectedCat, setSelectedCat] = useState(tx.category_id ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editAmount, setEditAmount] = useState(String(tx.amount))
  const [editMerchant, setEditMerchant] = useState(tx.merchant ?? '')
  const [editDescription, setEditDescription] = useState(tx.description ?? '')
  const [editDate, setEditDate] = useState(tx.transaction_date.slice(0, 16))
  const [editType, setEditType] = useState<'debit' | 'credit'>(tx.type)

  const groups = buildGroupsFromFlat(categories)
  const amountDisplay = hideAmounts ? '••••' : fmt(tx.amount, currency)

  const handleSaveCat = async () => {
    setSaving(true)
    await updateTransactionCategory(tx.id, selectedCat || null)
    setSaving(false)
    onUpdated()
    onClose()
  }

  const handleSaveEdit = async () => {
    const amt = parseFloat(editAmount)
    if (isNaN(amt) || amt <= 0) return
    setSaving(true)
    await updateTransaction(tx.id, {
      type: editType,
      amount: amt,
      merchant: editMerchant,
      description: editDescription,
      transaction_date: new Date(editDate).toISOString(),
    })
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
      <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-800">
          <h2 className="font-bold text-lg">Transaction Detail</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditMode(e => !e); setConfirmDelete(false) }}
              className={`text-sm px-3 py-1 rounded-lg transition-colors ${editMode ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {editMode ? 'Cancel Edit' : '✎ Edit'}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Amount */}
          {!editMode ? (
            <div className="text-center py-2">
              <p className={`text-3xl font-bold ${tx.type === 'debit' ? 'text-red-400' : 'text-green-400'}`}>
                {tx.type === 'debit' ? '−' : '+'}{amountDisplay}
              </p>
              <p className="text-slate-400 text-sm mt-1">{format(new Date(tx.transaction_date), 'dd MMM yyyy, hh:mm a')}</p>
            </div>
          ) : (
            <div className="space-y-3 p-3 rounded-xl border border-slate-600 bg-slate-700/30">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Edit Transaction</p>
              <div className="flex rounded-lg overflow-hidden border border-slate-600 text-sm">
                {(['debit', 'credit'] as const).map(t => (
                  <button key={t} onClick={() => setEditType(t)}
                    className={`flex-1 py-1.5 font-medium transition-colors ${editType === t ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                    {t === 'debit' ? 'Expense' : 'Income'}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs text-slate-400">Amount ({currency})</label>
                <input className="input mt-1 text-right font-mono" type="number" step="0.001" min="0"
                  value={editAmount} onChange={e => setEditAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Merchant / Name</label>
                <input className="input mt-1" type="text" value={editMerchant} onChange={e => setEditMerchant(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Description</label>
                <input className="input mt-1" type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400">Date & Time</label>
                <input className="input mt-1" type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} />
              </div>
              <button className="btn-primary w-full" onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving…' : '✓ Save Changes'}
              </button>
            </div>
          )}

          {/* Details */}
          {!editMode && (
            <div className="space-y-2 text-sm">
              {tx.merchant && <Row label="Merchant" value={tx.merchant} />}
              {tx.bank_name && <Row label="Bank" value={tx.bank_name} />}
              {tx.account_number && <Row label="Account" value={`A/C ${tx.account_number}`} />}
              {tx.balance_after != null && (
                <Row label="Balance After" value={hideAmounts ? '••••' : fmt(tx.balance_after, currency)} />
              )}
              {tx.description && <Row label="Description" value={tx.description} />}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Category</label>
            <select className="input mt-1" value={selectedCat} onChange={e => setSelectedCat(e.target.value)}>
              <option value="">Uncategorised</option>
              {groups.map(({ group, children }) =>
                children.length > 0 ? (
                  <optgroup key={group.id} label={group.name}>
                    {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                ) : null
              )}
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

function buildGroupsFromFlat(categories: Category[]) {
  const groups = categories.filter(c => !c.parent_id)
  return groups.map(g => ({ group: g, children: categories.filter(c => c.parent_id === g.id) }))
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100 text-right">{value}</span>
    </div>
  )
}
