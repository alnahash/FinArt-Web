import { useState } from 'react'
import type { Category } from '../types'

interface Props {
  categories: Category[]
  onClose: () => void
  onSave: (tx: {
    type: 'debit' | 'credit'
    amount: number
    merchant: string
    description: string
    bank_name: string
    account_number: string
    transaction_date: string
    category_id: string | undefined
  }) => Promise<void>
}

export default function AddTransactionModal({ categories, onClose, onSave }: Props) {
  const [type, setType] = useState<'debit' | 'credit'>('debit')
  const [amount, setAmount] = useState('')
  const [merchant, setMerchant] = useState('')
  const [description, setDescription] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        type, amount: Number(amount), merchant, description,
        bank_name: bankName, account_number: accountNumber,
        transaction_date: new Date(date).toISOString(),
        category_id: categoryId || undefined,
      })
      onClose()
    } catch {
      setError('Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="font-bold text-lg">Add Transaction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-4 space-y-3">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-600">
            {(['debit', 'credit'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
                  type === t
                    ? t === 'debit' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'debit' ? '↑ Debit' : '↓ Credit'}
              </button>
            ))}
          </div>

          <input className="input" type="number" placeholder="Amount (₹) *" value={amount} onChange={e => setAmount(e.target.value)} />
          <input className="input" type="text" placeholder="Merchant / Payee" value={merchant} onChange={e => setMerchant(e.target.value)} />
          <input className="input" type="text" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <input className="input" type="text" placeholder="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} />
          <input className="input" type="text" placeholder="Account Number (last 4)" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />

          <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">No Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <input className="input" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button className="btn-primary w-full mt-2" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
