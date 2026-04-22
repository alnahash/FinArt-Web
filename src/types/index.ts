export interface Profile {
  id: string
  full_name: string | null
  currency: string
  monthly_budget: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string | null
  color: string
  budget_limit: number
  created_at: string
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
}

export interface TransactionFilters {
  month?: number
  year?: number
  type?: 'debit' | 'credit'
  search?: string
}
