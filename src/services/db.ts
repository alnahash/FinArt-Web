import { supabase } from '../lib/supabase'
import type { Transaction, Category, CategoryGroup, Budget, MonthlySummary, CategorySpending, TransactionFilters } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthRange(year: number, month: number, startDay = 1) {
  const from = new Date(year, month - 1, startDay)
  const to = new Date(year, month, startDay - 1, 23, 59, 59)
  return { from: from.toISOString(), to: to.toISOString() }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password })

export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
  if (!error && data.user) {
    try { await supabase.rpc('create_default_categories', { p_user_id: data.user.id }) } catch { /* ignore */ }
  }
  return { data, error }
}

export const signOut = () => supabase.auth.signOut()

export const resetPassword = (email: string) =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/#/reset-password',
  })

// ── Profile ───────────────────────────────────────────────────────────────────

export const getProfile = (userId: string) =>
  supabase.from('profiles').select('*').eq('id', userId).single()

export const updateProfile = (userId: string, updates: Partial<{ full_name: string; monthly_budget: number; currency: string; month_start_day: number; start_month: number; hide_amounts: boolean }>) =>
  supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', userId)

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategories = (userId: string) =>
  supabase.from('categories').select('*').eq('user_id', userId).order('sort_order').order('name')

export const createCategory = (userId: string, cat: { name: string; icon?: string; color?: string; budget_limit?: number; parent_id?: string; recurrence_type?: string; is_income?: boolean }) =>
  supabase.from('categories').insert({ user_id: userId, ...cat }).select().single()

export const updateCategory = (id: string, updates: { name?: string; icon?: string; color?: string; is_income?: boolean; recurrence_type?: string }) =>
  supabase.from('categories').update(updates).eq('id', id)

export const deleteCategory = (id: string) =>
  supabase.from('categories').delete().eq('id', id)

export const reorderCategories = (items: { id: string; sort_order: number }[]) =>
  Promise.all(items.map(({ id, sort_order }) =>
    supabase.from('categories').update({ sort_order }).eq('id', id)
  ))

/** Groups flat categories into a tree: [ { group, children[] } ] */
export function buildCategoryTree(categories: Category[]): CategoryGroup[] {
  const groups = categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order)
  return groups.map(group => ({
    group,
    children: categories.filter(c => c.parent_id === group.id).sort((a, b) => a.sort_order - b.sort_order),
  }))
}

// ── Transactions ──────────────────────────────────────────────────────────────

export const getTransactions = async (userId: string, filters: TransactionFilters, limit = 30, offset = 0, startDay = 1) => {
  let q = supabase
    .from('transactions')
    .select('*, category:categories(*)', { count: 'exact' })
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.month && filters.year) {
    const { from, to } = monthRange(filters.year, filters.month, startDay)
    q = q.gte('transaction_date', from).lte('transaction_date', to)
  }
  if (filters.type) q = q.eq('type', filters.type)
  if (filters.categoryId) q = q.eq('category_id', filters.categoryId)
  if (filters.search) {
    q = q.or(`merchant.ilike.%${filters.search}%,description.ilike.%${filters.search}%,bank_name.ilike.%${filters.search}%`)
  }
  return q
}

export const insertTransaction = (
  userId: string,
  tx: {
    type: 'debit' | 'credit'
    amount: number
    merchant?: string
    description?: string
    bank_name?: string
    account_number?: string
    balance_after?: number
    transaction_date: string
    category_id?: string
    sms_body?: string
  }
) => supabase.from('transactions').insert({ user_id: userId, ...tx }).select('*, category:categories(*)').single()

export const updateTransaction = (id: string, updates: {
  type?: 'debit' | 'credit'
  amount?: number
  merchant?: string
  description?: string
  transaction_date?: string
}) => supabase.from('transactions').update(updates).eq('id', id).select('*, category:categories(*)').single()

export const updateTransactionCategory = (id: string, categoryId: string | null) =>
  supabase.from('transactions').update({ category_id: categoryId }).eq('id', id)

export const deleteTransaction = (id: string) =>
  supabase.from('transactions').delete().eq('id', id)

export const getMonthlySummary = async (userId: string, month: number, year: number, startDay = 1): Promise<MonthlySummary> => {
  const { from, to } = monthRange(year, month, startDay)

  const { data } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userId)
    .gte('transaction_date', from)
    .lte('transaction_date', to)

  const rows = data ?? []
  const totalDebit = rows.filter(r => r.type === 'debit').reduce((s, r) => s + Number(r.amount), 0)
  const totalCredit = rows.filter(r => r.type === 'credit').reduce((s, r) => s + Number(r.amount), 0)
  return { totalDebit, totalCredit, netSavings: totalCredit - totalDebit, transactionCount: rows.length }
}

export const getCategorySpending = async (userId: string, month: number, year: number, categories: Category[], startDay = 1): Promise<CategorySpending[]> => {
  const { from, to } = monthRange(year, month, startDay)

  const { data: txs } = await supabase
    .from('transactions')
    .select('category_id, amount, type')
    .eq('user_id', userId)
    .gte('transaction_date', from)
    .lte('transaction_date', to)

  const { data: budgets } = await supabase
    .from('budgets')
    .select('category_id, amount')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)

  const debitMap: Record<string, number> = {}
  const creditMap: Record<string, number> = {}
  for (const tx of txs ?? []) {
    if (!tx.category_id) continue
    if (tx.type === 'debit') debitMap[tx.category_id] = (debitMap[tx.category_id] ?? 0) + Number(tx.amount)
    else creditMap[tx.category_id] = (creditMap[tx.category_id] ?? 0) + Number(tx.amount)
  }

  const budgetMap: Record<string, number> = {}
  for (const b of budgets ?? []) {
    if (b.category_id) budgetMap[b.category_id] = Number(b.amount)
  }

  return categories
    .filter(c => c.parent_id !== null)
    .map(cat => {
      const isIncome = cat.is_income
      const spent = isIncome ? (creditMap[cat.id] ?? 0) : (debitMap[cat.id] ?? 0)
      const budget = budgetMap[cat.id] ?? cat.budget_limit ?? 0
      return { category: cat, spent, budget, isIncome, percentage: budget > 0 ? Math.min((spent / budget) * 100, 100) : 0 }
    })
    .filter(c => c.spent > 0 || c.budget > 0)
    .sort((a, b) => (a.category.sort_order ?? 0) - (b.category.sort_order ?? 0))
}

export const getMonthlyTotals = async (
  userId: string,
  periods: { month: number; year: number }[],
  startDay = 1
): Promise<{ month: number; year: number; debit: number; credit: number }[]> => {
  if (!periods.length) return []
  const first = periods[0], last = periods[periods.length - 1]
  const { from } = monthRange(first.year, first.month, startDay)
  const { to } = monthRange(last.year, last.month, startDay)

  const { data } = await supabase
    .from('transactions')
    .select('type, amount, transaction_date')
    .eq('user_id', userId)
    .gte('transaction_date', from)
    .lte('transaction_date', to)

  return periods.map(({ month, year }) => {
    const { from: pFrom, to: pTo } = monthRange(year, month, startDay)
    const start = new Date(pFrom), end = new Date(pTo)
    const rows = (data ?? []).filter(t => {
      const d = new Date(t.transaction_date)
      return d >= start && d <= end
    })
    return {
      month, year,
      debit: rows.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0),
      credit: rows.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0),
    }
  })
}

// ── Budgets ───────────────────────────────────────────────────────────────────

export const getBudgets = (userId: string, month: number, year: number) =>
  supabase.from('budgets').select('*, category:categories(*)').eq('user_id', userId).eq('month', month).eq('year', year)

export const upsertBudget = (userId: string, categoryId: string, month: number, year: number, amount: number) =>
  supabase.from('budgets').upsert({ user_id: userId, category_id: categoryId, month, year, amount }, { onConflict: 'user_id,category_id,month,year' })

export const copyBudgetsFromPreviousMonth = async (userId: string, month: number, year: number) => {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const { data: prev } = await getBudgets(userId, prevMonth, prevYear)
  if (!prev || prev.length === 0) return { copied: 0 }
  await Promise.all(
    prev
      .filter((b: Budget) => b.category_id && b.amount > 0)
      .map((b: Budget) => upsertBudget(userId, b.category_id!, month, year, b.amount))
  )
  return { copied: prev.length }
}
