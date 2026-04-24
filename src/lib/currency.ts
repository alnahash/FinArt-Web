export function fmt(amount: number, currency = 'BHD'): string {
  const abs = Math.abs(amount)
  if (currency === 'BHD') return `BD ${abs.toLocaleString('en', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
  if (currency === 'INR') return `₹${abs.toLocaleString('en-IN')}`
  if (currency === 'SAR') return `SAR ${abs.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (currency === 'AED') return `AED ${abs.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `${currency} ${abs.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function evaluateExpr(expr: string): number {
  if (!expr) return 0
  try {
    const norm = expr.trim()
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
    // Only allow digits, operators, dots, spaces — no variables or calls
    if (!/^[\d\s+\-*/().]+$/.test(norm)) return 0
    // eslint-disable-next-line no-new-func
    const result = new Function('return (' + norm + ')')() as number
    return typeof result === 'number' && isFinite(result) && result >= 0 ? result : 0
  } catch {
    return 0
  }
}
