export interface Profile {
  id: string
  full_name: string | null
  currency: string
  monthly_budget: number
  month_start_day: number
  start_month: number
  hide_amounts: boolean
  created_at: string
  updated_at: string
}

export type RecurrenceType = 'none' | 'one_time' | 'monthly' | 'weekly' | 'yearly'

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string | null
  color: string
  budget_limit: number
  parent_id: string | null
  sort_order: number
  is_income: boolean
  recurrence_type: RecurrenceType
  created_at: string
}

export interface CategoryGroup {
  group: Category
  children: Category[]
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  type: 'debit' | 'credit'
  amount: number
  description: string | null
  merchant: string | null
  account_number: string | null
  bank_name: string | null
  balance_after: number | null
  sms_body: string | null
  transaction_date: string
  created_at: string
  category?: Category
}

export interface Budget {
  id: string
  user_id: string
  category_id: string | null
  month: number
  year: number
  amount: number
  created_at: string
  category?: Category
}

export interface MonthlySummary {
  totalDebit: number
  totalCredit: number
  netSavings: number
  transactionCount: number
}

export interface CategorySpending {
  category: Category
  spent: number
  budget: number
  percentage: number
  isIncome: boolean
}

export interface TransactionFilters {
  month?: number
  year?: number
  type?: 'debit' | 'credit'
  search?: string
}
