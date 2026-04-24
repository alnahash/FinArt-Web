import { useState } from 'react'
import type { Category } from '../types'
import { buildCategoryTree } from '../services/db'
import { evaluateExpr } from '../lib/currency'

interface Props {
  categories: Category[]
  currency?: string
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

// 4×4 numpad: digits + operators
const NUMPAD = [
  '7','8','9','+',
  '4','5','6','−',
  '1','2','3','×',
  '.','0','⌫','÷',
]

export default function AddTransactionModal({ categories, currency = 'BHD', onClose, onSave }: Props) {
  const [type, setType] = useState<'debit' | 'credit'>('debit')
  const [amountExpr, setAmountExpr] = useState('')
  const [merchant, setMerchant] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const tree = buildCategoryTree(categories)
  // Use is_income flag instead of hard-coded names
  const relevantGroups = tree.filter(g =>
    type === 'credit' ? g.group.is_income : !g.group.is_income
  )

  const OPERATORS = ['+', '−', '×', '÷']

  const handleKey = (k: string) => {
    setError('')
    if (k === '⌫') { setAmountExpr(a => a.slice(0, -1)); return }
    if (k === '.') {
      const last = amountExpr.split(/[+\-×÷]/).pop() ?? ''
      if (!last.includes('.')) setAmountExpr(a => a + '.')
      return
    }
    if (OPERATORS.includes(k)) {
      if (amountExpr && !OPERATORS.includes(amountExpr.slice(-1))) setAmountExpr(a => a + k)
      return
    }
    setAmountExpr(a => a + k)
  }

  const handleSave = async () => {
    const num = evaluateExpr(amountExpr)
    if (!amountExpr || num <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    try {
      await onSave({
        type, amount: num, merchant, description: '',
        bank_name: '', account_number: accountNumber,
        transaction_date: new Date(date).toISOString(),
        category_id: categoryId || undefined,
      })
      onClose()
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#12101a]" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div className="flex items-center px-4 pt-10 pb-5">
        <button onClick={onClose} className="text-indigo-400 text-3xl leading-none w-8">‹</button>
        <h1 className="flex-1 text-center text-base font-bold tracking-[0.15em] text-indigo-300 uppercase">
          Add Transaction
        </h1>
        <div className="w-8" />
      </div>

      {/* Form rows */}
      <div className="flex-1 overflow-y-auto">
        {/* Type */}
        <div className="flex items-center px-5 py-3.5 border-b border-slate-800">
          <span className="text-slate-400 w-28 text-sm">Type</span>
          <div className="flex gap-0 rounded-lg overflow-hidden border border-slate-700 ml-auto">
            {(['debit','credit'] as const).map(t => (
              <button key={t} onClick={() => { setType(t); setCategoryId('') }}
                className={`px-4 py-1.5 text-sm font-medium uppercase tracking-wide transition-colors ${
                  type === t ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {t === 'debit' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="flex items-center px-5 py-3.5 border-b border-slate-800">
          <span className="text-slate-400 w-28 text-sm shrink-0">{type === 'debit' ? 'Debit A/c' : 'Credit A/c'}</span>
          <input className="flex-1 bg-transparent text-slate-200 text-right text-sm focus:outline-none placeholder-slate-600"
            placeholder="Account / bank" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
        </div>

        {/* Description */}
        <div className="flex items-center px-5 py-3.5 border-b border-slate-800">
          <span className="text-slate-400 w-28 text-sm shrink-0">Description</span>
          <input className="flex-1 bg-transparent text-slate-200 text-right text-sm focus:outline-none placeholder-slate-600"
            placeholder="Name of shop, brand or person" value={merchant} onChange={e => setMerchant(e.target.value)} />
        </div>

        {/* Category */}
        <div className="flex items-center px-5 py-3.5 border-b border-slate-800">
          <span className="text-slate-400 w-28 text-sm shrink-0">Category</span>
          <div className="flex-1 flex justify-end">
            <select className="bg-transparent text-slate-200 text-sm text-right focus:outline-none appearance-none cursor-pointer"
              value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="" className="bg-slate-900">Misc</option>
              {relevantGroups.map(({ group, children }) =>
                children.length > 0 ? (
                  <optgroup key={group.id} label={group.name} className="bg-slate-900">
                    {children.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                  </optgroup>
                ) : null
              )}
            </select>
            <span className="text-slate-500 ml-1 text-sm">▾</span>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center px-5 py-3.5 border-b border-slate-800">
          <span className="text-slate-400 text-sm mr-3">📅</span>
          <input className="flex-1 bg-transparent text-slate-300 text-sm focus:outline-none"
            type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
          <span className="text-slate-400 text-sm ml-3 border-l border-slate-700 pl-3">{currency}</span>
        </div>
      </div>

      {/* Amount section */}
      <div className="bg-[#1a1727] border-t border-slate-800">
        <div className="px-5 pt-3 pb-2">
          <p className="text-xs tracking-[0.2em] text-slate-500 uppercase mb-2">Amount</p>
          <div className="flex items-center gap-3">
            <span className="text-indigo-400 font-bold text-lg bg-slate-800 px-3 py-1.5 rounded-lg">{currency}</span>
            <span className="flex-1 text-3xl font-light text-slate-100 tracking-wider min-h-[40px] truncate">
              {amountExpr || <span className="text-slate-600">0</span>}
            </span>
            <button onClick={() => setAmountExpr(a => a.slice(0, -1))}
              className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-700 transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
              </svg>
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>

        {/* Numpad — 4 columns */}
        <div className="grid grid-cols-4">
          {NUMPAD.map(k => {
            const isOp = OPERATORS.includes(k)
            const isBack = k === '⌫'
            return (
              <button
                key={k}
                onClick={() => handleKey(k)}
                className={`py-4 text-xl font-light hover:bg-slate-700/60 active:bg-indigo-900/40 transition-colors border-t border-slate-700/40 select-none ${
                  isOp ? 'text-indigo-400 font-bold' : isBack ? 'text-slate-400' : 'text-slate-200'
                }`}
              >
                {k}
              </button>
            )
          })}
        </div>

        {/* Cancel / OK */}
        <div className="grid grid-cols-2 border-t border-slate-700">
          <button onClick={onClose}
            className="py-4 text-slate-400 font-semibold tracking-[0.1em] uppercase hover:bg-slate-800 transition-colors text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !amountExpr}
            className="py-4 text-indigo-400 font-semibold tracking-[0.1em] uppercase border-l border-slate-700 hover:bg-indigo-500/10 transition-colors text-sm disabled:opacity-40">
            {saving ? '...' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
