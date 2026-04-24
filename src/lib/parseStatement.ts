import * as XLSX from 'xlsx'

export interface ColumnMapping {
  date: string
  amount: string
  time?: string
  merchant?: string
  category?: string
  transactionType?: string
  account?: string
}

export interface ParsedRow {
  rawDate: string
  isoDate: string
  amount: number
  type: 'debit' | 'credit'
  merchant: string
  categoryName: string
  bankName: string
  selected: boolean
}

// Known auto-detectable formats
const FINART_HEADERS = ['Date', 'Amount', 'Transaction Time', 'Description', 'Category', 'Transaction Type', 'Account', 'More Details']

export function detectMapping(headers: string[]): ColumnMapping | null {
  const h = headers.map(s => s.trim())
  // FinArt format
  if (FINART_HEADERS.slice(0, 4).every(hdr => h.includes(hdr))) {
    return {
      date: 'Date',
      amount: 'Amount',
      time: 'Transaction Time',
      merchant: 'Description',
      category: 'Category',
      transactionType: 'Transaction Type',
      account: 'Account',
    }
  }
  return null
}

function parseDate(raw: string, timePart?: string): string {
  if (!raw) return new Date().toISOString()
  // DD/MM/YYYY
  const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy
    const time = timePart ?? '00:00:00'
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${time}`).toISOString()
  }
  // MM/DD/YYYY or ISO
  const parsed = new Date(raw)
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function rowsFromSheet(rows: Record<string, string>[], mapping: ColumnMapping): ParsedRow[] {
  return rows.map(row => {
    const rawDate = (row[mapping.date] ?? '').trim()
    const timePart = mapping.time ? (row[mapping.time] ?? '').trim() : undefined
    const isoDate = parseDate(rawDate, timePart)
    const rawAmount = parseFloat((row[mapping.amount] ?? '0').replace(/[, ]/g, '')) || 0
    const amount = Math.abs(rawAmount)
    const typeHint = mapping.transactionType ? (row[mapping.transactionType] ?? '').toUpperCase() : ''
    let type: 'debit' | 'credit' = rawAmount < 0 ? 'debit' : 'credit'
    if (typeHint === 'INCOME') type = 'credit'
    if (typeHint === 'EXPENSE') type = 'debit'
    const merchant = (mapping.merchant ? row[mapping.merchant] : '') ?? ''
    const categoryName = (mapping.category ? row[mapping.category] : '') ?? ''
    const bankName = (mapping.account ? row[mapping.account] : '') ?? ''

    return {
      rawDate,
      isoDate,
      amount,
      type,
      merchant: merchant.trim(),
      categoryName: categoryName.trim(),
      bankName: bankName.trim(),
      selected: true,
    }
  }).filter(r => r.amount > 0)
}

// Parse a quoted CSV string
function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []
  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ }
      else if (c === ',' && !inQ) { result.push(cur); cur = '' }
      else cur += c
    }
    result.push(cur)
    return result.map(s => s.trim())
  }
  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const vals = parseRow(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
}

export function parseFile(
  file: File,
  onResult: (headers: string[], rows: Record<string, string>[], autoMapping: ColumnMapping | null) => void
) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv' || ext === 'txt') {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseCSVText(text)
      const headers = rows.length > 0 ? Object.keys(rows[0]) : []
      onResult(headers, rows, detectMapping(headers))
    }
    reader.readAsText(file)
  } else {
    const reader = new FileReader()
    reader.onload = e => {
      const wb = XLSX.read(e.target?.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
      const headers = data.length > 0 ? Object.keys(data[0]) : []
      onResult(headers, data, detectMapping(headers))
    }
    reader.readAsArrayBuffer(file)
  }
}

export function applyMapping(rows: Record<string, string>[], mapping: ColumnMapping): ParsedRow[] {
  return rowsFromSheet(rows, mapping)
}
