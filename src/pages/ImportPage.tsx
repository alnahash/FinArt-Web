import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getCategories, insertTransaction } from '../services/db'
import type { Category } from '../types'
import { parseFile, applyMapping, detectMapping } from '../lib/parseStatement'
import type { ColumnMapping, ParsedRow } from '../lib/parseStatement'

type Step = 'upload' | 'map' | 'preview' | 'done'

const REQUIRED_FIELDS: { key: keyof ColumnMapping; label: string }[] = [
  { key: 'date',            label: 'Date' },
  { key: 'amount',          label: 'Amount' },
  { key: 'merchant',        label: 'Merchant / Description' },
  { key: 'category',        label: 'Category' },
  { key: 'transactionType', label: 'Transaction Type (income/expense)' },
  { key: 'account',         label: 'Account / Bank' },
]

export default function ImportPage() {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({ date: '', amount: '' })
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [catOverrides, setCatOverrides] = useState<Record<number, string>>({})
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [importError, setImportError] = useState('')

  const subCats = categories.filter(c => c.parent_id !== null)

  const matchCategory = useCallback((name: string): string => {
    if (!name) return ''
    const lower = name.toLowerCase()
    return subCats.find(c => c.name.toLowerCase() === lower)?.id
      ?? subCats.find(c => lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower))?.id
      ?? ''
  }, [subCats])

  const loadFile = (file: File) => {
    setFileName(file.name)
    getCategories(user!.id).then(({ data }) => setCategories(data ?? []))
    parseFile(file, (hdrs, raws, autoMap) => {
      setHeaders(hdrs)
      setRawRows(raws)
      if (autoMap) {
        const parsed = applyMapping(raws, autoMap)
        setRows(parsed)
        setMapping(autoMap)
        setStep('preview')
      } else {
        setMapping({ date: '', amount: '' })
        setStep('map')
      }
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  const handleApplyMapping = () => {
    if (!mapping.date || !mapping.amount) return
    const parsed = applyMapping(rawRows, mapping)
    setRows(parsed)
    setStep('preview')
  }

  const toggleRow = (i: number) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, selected: !r.selected } : r))

  const toggleAll = (val: boolean) =>
    setRows(prev => prev.map(r => ({ ...r, selected: val })))

  const handleImport = async () => {
    if (!user) return
    setImporting(true)
    setImportError('')
    let imported = 0, skipped = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.selected) { skipped++; continue }
      const categoryId = catOverrides[i] !== undefined ? catOverrides[i] : matchCategory(row.categoryName)
      try {
        await insertTransaction(user.id, {
          type: row.type,
          amount: row.amount,
          merchant: row.merchant,
          description: row.categoryName,
          bank_name: row.bankName,
          account_number: '',
          transaction_date: row.isoDate,
          category_id: categoryId || undefined,
        })
        imported++
      } catch {
        skipped++
      }
    }
    setImportedCount(imported)
    setSkippedCount(skipped)
    setImporting(false)
    setStep('done')
  }

  const selectedCount = rows.filter(r => r.selected).length

  return (
    <div className="p-4 space-y-4 pb-24">
      <h2 className="font-semibold text-slate-200 text-lg">Import Transactions</h2>

      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
            dragging ? 'border-purple-400 bg-purple-500/10' : 'border-slate-600 hover:border-slate-400 bg-slate-800/30'
          }`}
        >
          <p className="text-4xl mb-3">📂</p>
          <p className="text-slate-200 font-medium mb-1">Drop a file here or tap to browse</p>
          <p className="text-slate-500 text-sm">Supports CSV and Excel (.xlsx, .xls)</p>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handleFileInput} />
        </div>
      )}

      {/* ── Step 2: Column Mapper ── */}
      {step === 'map' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('upload')} className="text-slate-400 hover:text-slate-200 text-xl">‹</button>
            <div>
              <p className="font-medium text-slate-200">{fileName}</p>
              <p className="text-xs text-slate-500">{rawRows.length} rows detected — map columns below</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 overflow-hidden divide-y divide-slate-700">
            {REQUIRED_FIELDS.map(f => (
              <div key={f.key} className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm text-slate-300 flex-1">{f.label}</span>
                <select
                  className="bg-slate-700 text-slate-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 min-w-[140px]"
                  value={mapping[f.key] ?? ''}
                  onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                >
                  <option value="">— Skip —</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/50 rounded-xl p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300 mb-1">Preview (first 3 rows)</p>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>{headers.map(h => <th key={h} className="pr-4 pb-1 text-slate-500 font-medium text-left">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 3).map((r, i) => (
                    <tr key={i}>{headers.map(h => <td key={h} className="pr-4 py-0.5 text-slate-400">{r[h]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleApplyMapping}
            disabled={!mapping.date || !mapping.amount}
            className="btn-primary w-full py-3 disabled:opacity-40"
          >
            Preview Transactions →
          </button>
        </div>
      )}

      {/* ── Step 3: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(detectMapping(headers) ? 'upload' : 'map')} className="text-slate-400 hover:text-slate-200 text-xl">‹</button>
            <div className="flex-1">
              <p className="font-medium text-slate-200">{fileName}</p>
              <p className="text-xs text-slate-500">{rows.length} rows parsed</p>
            </div>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-center">
              <p className="text-lg font-bold text-slate-100">{rows.length}</p>
              <p className="text-xs text-slate-500">Total rows</p>
            </div>
            <div className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-center">
              <p className="text-lg font-bold text-green-400">{selectedCount}</p>
              <p className="text-xs text-slate-500">Selected</p>
            </div>
            <div className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-center">
              <p className="text-lg font-bold text-slate-400">{rows.length - selectedCount}</p>
              <p className="text-xs text-slate-500">Skipped</p>
            </div>
          </div>

          {/* Select all / deselect all */}
          <div className="flex gap-2 text-xs">
            <button onClick={() => toggleAll(true)} className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Select all</button>
            <button onClick={() => toggleAll(false)} className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Deselect all</button>
            <span className="ml-auto text-slate-500 self-center">Tap row to toggle</span>
          </div>

          {/* Row list */}
          <div className="rounded-2xl overflow-hidden border border-slate-700 divide-y divide-slate-700/60 max-h-[50vh] overflow-y-auto">
            {rows.map((row, i) => {
              const matchedId = catOverrides[i] !== undefined ? catOverrides[i] : matchCategory(row.categoryName)
              const matchedCat = subCats.find(c => c.id === matchedId)
              return (
                <div
                  key={i}
                  onClick={() => toggleRow(i)}
                  className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                    row.selected ? 'bg-slate-800/40' : 'bg-slate-900/60 opacity-40'
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                    row.selected ? 'bg-purple-500 border-purple-500' : 'border-slate-600'
                  }`}>
                    {row.selected && <span className="text-white text-xs leading-none">✓</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs text-slate-500 flex-shrink-0">{row.rawDate}</span>
                      <span className="text-xs text-slate-400 truncate">{row.merchant || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <select
                        className="text-xs rounded-lg px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer min-w-0 truncate"
                        style={{ backgroundColor: matchedCat ? matchedCat.color + '22' : 'var(--bg-input)', color: matchedCat?.color ?? 'var(--text-3)', border: `1px solid ${matchedCat?.color ?? '#475569'}44` }}
                        value={matchedId}
                        onChange={e => setCatOverrides(o => ({ ...o, [i]: e.target.value }))}
                      >
                        <option value="">Uncategorised</option>
                        {subCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {row.categoryName && !matchedCat && (
                        <span className="text-xs text-yellow-500/70 flex-shrink-0">"{row.categoryName}"</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-sm font-semibold ${row.type === 'credit' ? 'text-green-400' : 'text-slate-100'}`}>
                      {row.type === 'credit' ? '+' : '-'}{row.amount.toFixed(3)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {importError && <p className="text-xs text-red-400 text-center">{importError}</p>}

          <button
            onClick={handleImport}
            disabled={importing || selectedCount === 0}
            className="btn-primary w-full py-3 disabled:opacity-40 text-base font-semibold"
          >
            {importing ? `Importing… (${importedCount} done)` : `Import ${selectedCount} Transactions`}
          </button>
        </div>
      )}

      {/* ── Step 4: Done ── */}
      {step === 'done' && (
        <div className="text-center py-12 space-y-4">
          <p className="text-5xl">✅</p>
          <p className="text-xl font-bold text-slate-100">Import Complete</p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3">
              <p className="text-2xl font-bold text-green-400">{importedCount}</p>
              <p className="text-xs text-slate-400">Imported</p>
            </div>
            <div className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-3">
              <p className="text-2xl font-bold text-slate-400">{skippedCount}</p>
              <p className="text-xs text-slate-400">Skipped</p>
            </div>
          </div>
          <button
            onClick={() => { setStep('upload'); setFileName(''); setRows([]); setRawRows([]); setHeaders([]); setCatOverrides({}) }}
            className="btn-primary px-6 py-2.5 text-sm"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  )
}
