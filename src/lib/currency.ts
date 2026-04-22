export function fmt(amount: number, currency = 'BHD'): string {
  const abs = Math.abs(amount)
  if (currency === 'BHD') return `BD ${abs.toLocaleString('en', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
  if (currency === 'INR') return `₹${abs.toLocaleString('en-IN')}`
  return `${currency} ${abs.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function evaluateExpr(expr: string): number {
  if (!expr) return 0
  const parts = expr.split('+').map(s => parseFloat(s) || 0)
  return parts.reduce((a, b) => a + b, 0)
}
