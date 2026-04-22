import { useState, useEffect, useCallback, useRef } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { getTransactions, getCategories, insertTransaction } from '../services/db'
import type { Transaction, Category } from '../types'
import TransactionCard from '../components/TransactionCard'
import AddTransactionModal from '../components/AddTransactionModal'
import TransactionDetailModal from '../components/TransactionDetailModal'

const PAGE = 25

export default function TransactionsPage() {
  const { user } = useAuth()
  const profile = useProfile()
  const currency = profile?.currency ?? 'BHD'
  const [currentDate, setCurrentDate] = useState(new Date())
  const [txs, setTxs] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 350)
  }, [search])

  const loadTxs = useCallback(async (reset = true) => {
    if (!user) return
    const newOffset = reset ? 0 : offset
    if (reset) setLoading(true)
    else setLoadingMore(true)

    const { data, count } = await getTransactions(
      user.id,
      { month, year, type: typeFilter === 'all' ? undefined : typeFilter, search: debouncedSearch || undefined },
      PAGE, newOffset
    )
    if (reset) setTxs(data as Transaction[] ?? [])
    else setTxs(prev => [...prev, ...(data as Transaction[] ?? [])])
    setTotal(count ?? 0)
    setOffset(newOffset + PAGE)
    if (reset) setLoading(false)
    else setLoadingMore(false)
  }, [user, month, year, typeFilter, debouncedSearch, offset])

  useEffect(() => { loadTxs(true) }, [user, month, year, typeFilter, debouncedSearch]) // eslint-disable-line

  useEffect(() => {
    if (!user) return
    getCategories(user.id).then(({ data }) => setCategories(data ?? []))
  }, [user])

  const handleAddTx = async (tx: Parameters<typeof insertTransaction>[1]) => {
    if (!user) return
    await insertTransaction(user.id, tx)
    loadTxs(true)
  }

  const handleRefresh = () => loadTxs(true)

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-4 space-y-3 sticky top-14 bg-slate-950 z-10 border-b border-slate-800">
        {/* Month selector */}
        <div className="flex items-center justify-between">
          <button className="btn-ghost" onClick={() => setCurrentDate(d => subMonths(d, 1))}>‹</button>
          <span className="font-semibold text-slate-200">{format(currentDate, 'MMMM yyyy')}</span>
          <button
            className="btn-ghost"
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            disabled={format(currentDate, 'MM/yyyy') === format(new Date(), 'MM/yyyy')}
          >›</button>
        </div>

        {/* Search */}
        <input
          className="input"
          type="text"
          placeholder="Search merchant, bank…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Type filter */}
        <div className="flex gap-2">
          {(['all', 'debit', 'credit'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                typeFilter === t
                  ? t === 'debit' ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                    : t === 'credit' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                    : 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40'
                  : 'bg-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'all' ? 'All' : t === 'debit' ? '↑ Debit' : '↓ Credit'}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500 self-center">{total} transactions</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : txs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-3xl mb-2">📭</p>
            <p>No transactions found</p>
            <button className="btn-primary mt-4 text-sm" onClick={() => setShowAdd(true)}>+ Add Transaction</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {txs.map(tx => (
              <TransactionCard key={tx.id} tx={tx} onClick={() => setSelectedTx(tx)} />
            ))}
            {txs.length < total && (
              <div className="p-4 text-center">
                <button
                  className="btn-ghost text-sm"
                  onClick={() => loadTxs(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading…' : `Load more (${total - txs.length} remaining)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full shadow-lg text-2xl flex items-center justify-center transition-colors z-20"
      >
        +
      </button>

      {showAdd && (
        <AddTransactionModal
          categories={categories}
          currency={currency}
          onClose={() => setShowAdd(false)}
          onSave={handleAddTx}
        />
      )}
      {selectedTx && (
        <TransactionDetailModal
          tx={selectedTx}
          categories={categories}
          onClose={() => setSelectedTx(null)}
          onUpdated={handleRefresh}
        />
      )}
    </div>
  )
}
