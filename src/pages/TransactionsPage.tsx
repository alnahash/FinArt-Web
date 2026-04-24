import { useState, useEffect, useCallback, useRef } from 'react'
import { format, addMonths, subMonths, isSameMonth } from 'date-fns'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { getTransactions, getCategories, insertTransaction, buildCategoryTree } from '../services/db'
import type { Transaction, Category } from '../types'
import TransactionCard from '../components/TransactionCard'
import AddTransactionModal from '../components/AddTransactionModal'
import TransactionDetailModal from '../components/TransactionDetailModal'
import CategoryDropdown from '../components/CategoryDropdown'
import { deleteTransaction } from '../services/db'

const PAGE = 25

export default function TransactionsPage() {
  const { user } = useAuth()
  const profile = useProfile()
  const currency = profile?.currency ?? 'BHD'
  const hideAmounts = profile?.hide_amounts ?? false
  const startDay = profile?.month_start_day ?? 1

  const [currentDate, setCurrentDate] = useState(new Date())
  const [txs, setTxs] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()
  const isCurrentMonth = isSameMonth(currentDate, new Date())

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
      {
        month, year,
        type: typeFilter === 'all' ? undefined : typeFilter,
        search: debouncedSearch || undefined,
        categoryId: categoryFilter || undefined,
      },
      PAGE, newOffset, startDay
    )
    if (reset) setTxs(data as Transaction[] ?? [])
    else setTxs(prev => [...prev, ...(data as Transaction[] ?? [])])
    setTotal(count ?? 0)
    setOffset(newOffset + PAGE)
    if (reset) setLoading(false)
    else setLoadingMore(false)
  }, [user, month, year, typeFilter, debouncedSearch, categoryFilter, startDay, offset])

  useEffect(() => { loadTxs(true) }, [user, month, year, typeFilter, debouncedSearch, categoryFilter, startDay]) // eslint-disable-line

  useEffect(() => {
    if (!user) return
    getCategories(user.id).then(({ data }) => setCategories(data ?? []))
  }, [user])

  const handleAddTx = async (tx: Parameters<typeof insertTransaction>[1]) => {
    if (!user) return
    await insertTransaction(user.id, tx)
    loadTxs(true)
  }

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === txs.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(txs.map(t => t.id)))
  }

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await deleteTransaction(id)
    }
    setSelectedIds(new Set())
    setShowDeleteConfirm(false)
    loadTxs(true)
  }

  const subCats = categories.filter(c => c.parent_id !== null)
  const tree = buildCategoryTree(categories)

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="p-4 space-y-3 sticky top-14 bg-slate-950 z-10 border-b border-slate-800">
        {/* Month selector */}
        <div className="flex items-center justify-between gap-2">
          <button className="btn-ghost" onClick={() => setCurrentDate(d => subMonths(d, 1))}>‹</button>
          <span className="font-semibold text-slate-200 flex-1 text-center">{format(currentDate, 'MMMM yyyy')}</span>
          {!isCurrentMonth && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg bg-indigo-500/10 transition-colors"
            >Today</button>
          )}
          <button
            className="btn-ghost"
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            disabled={isCurrentMonth}
          >›</button>
        </div>

        {/* Search */}
        <input className="input" type="text" placeholder="Search merchant, bank…"
          value={search} onChange={e => setSearch(e.target.value)} />

        {/* Filters row / Selection row */}
        {selectedIds.size > 0 ? (
          <div className="flex gap-2 items-center">
            <input type="checkbox" checked={selectedIds.size === txs.length} onChange={toggleSelectAll}
              className="w-4 h-4 cursor-pointer" />
            <span className="text-sm text-slate-400">{selectedIds.size} selected</span>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="ml-auto px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors">
              Delete
            </button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {(['all', 'debit', 'credit'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                  typeFilter === t
                    ? t === 'debit' ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                      : t === 'credit' ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/40'
                      : 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40'
                    : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                }`}>
                {t === 'all' ? 'All' : t === 'debit' ? '↑ Debit' : '↓ Credit'}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-500 self-center">{total} transactions</span>
          </div>
        )}

        {/* Category filter */}
        <CategoryDropdown
          value={categoryFilter}
          onChange={setCategoryFilter}
          tree={tree}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto overflow-x-hidden overflow-y-auto">
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
              <TransactionCard key={tx.id} tx={tx} currency={currency} hideAmounts={hideAmounts}
                onClick={() => selectedIds.size === 0 && setSelectedTx(tx)}
                showCheckbox={selectedIds.size > 0}
                isSelected={selectedIds.has(tx.id)}
                onToggleSelect={() => toggleSelection(tx.id)} />
            ))}
            {txs.length < total && (
              <div className="p-4 text-center">
                <button className="btn-ghost text-sm" onClick={() => loadTxs(false)} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : `Load more (${total - txs.length} remaining)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full shadow-lg text-2xl flex items-center justify-center transition-colors z-20">
        +
      </button>

      {showAdd && (
        <AddTransactionModal categories={categories} currency={currency}
          onClose={() => setShowAdd(false)} onSave={handleAddTx} />
      )}
      {selectedTx && (
        <TransactionDetailModal tx={selectedTx} categories={categories}
          currency={currency} hideAmounts={hideAmounts}
          onClose={() => setSelectedTx(null)} onUpdated={() => loadTxs(true)} />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-slate-700">
            <p className="text-lg font-semibold text-slate-100 mb-2">Delete {selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''}?</p>
            <p className="text-sm text-slate-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 text-slate-200 font-medium hover:bg-slate-600 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteSelected}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
