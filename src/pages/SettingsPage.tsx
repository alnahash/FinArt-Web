import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { getProfile, updateProfile, signOut, getCategories, createCategory, deleteCategory, buildCategoryTree } from '../services/db'
import type { Profile, Category, CategoryGroup } from '../types'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const CURRENCIES = [
  { code: 'BHD', label: 'Bahrain (BHD)' },
  { code: 'SAR', label: 'Saudi Arabia (SAR)' },
  { code: 'AED', label: 'UAE (AED)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'INR', label: 'India (INR)' },
]

export default function SettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isDark, toggle: toggleTheme } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tree, setTree] = useState<CategoryGroup[]>([])
  const [allCats, setAllCats] = useState<Category[]>([])
  const [fullName, setFullName] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [budgetEnabled, setBudgetEnabled] = useState(false)
  const [currency, setCurrency] = useState('BHD')
  const [monthStartDay, setMonthStartDay] = useState(1)
  const [startMonth, setStartMonth] = useState(1)
  const [hideAmounts, setHideAmounts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [newCatParent, setNewCatParent] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCatSection, setShowCatSection] = useState(false)

  const loadCategories = async () => {
    if (!user) return
    const { data } = await getCategories(user.id)
    const cats = data ?? []
    setAllCats(cats)
    setTree(buildCategoryTree(cats))
  }

  useEffect(() => {
    if (!user) return
    Promise.all([getProfile(user.id), getCategories(user.id)]).then(([profileRes, catsRes]) => {
      const p = profileRes.data
      if (p) {
        setProfile(p)
        setFullName(p.full_name ?? '')
        setMonthlyBudget(String(p.monthly_budget ?? ''))
        setBudgetEnabled((p.monthly_budget ?? 0) > 0)
        setCurrency(p.currency ?? 'BHD')
        setMonthStartDay(p.month_start_day ?? 1)
        setStartMonth(p.start_month ?? 1)
        setHideAmounts(p.hide_amounts ?? false)
      }
      const cats = catsRes.data ?? []
      setAllCats(cats)
      setTree(buildCategoryTree(cats))
      setLoading(false)
    })
  }, [user])

  const saveProfile = async (updates: Partial<Parameters<typeof updateProfile>[1]>) => {
    if (!user) return
    setSaving(true)
    await updateProfile(user.id, updates)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveProfile = () =>
    saveProfile({
      full_name: fullName,
      monthly_budget: budgetEnabled ? Number(monthlyBudget) || 0 : 0,
      currency,
      month_start_day: monthStartDay,
      start_month: startMonth,
      hide_amounts: hideAmounts,
    })

  const handleAddCategory = async () => {
    if (!user || !newCatName.trim()) return
    setAddingCat(true)
    const { data } = await createCategory(user.id, {
      name: newCatName.trim(),
      color: newCatColor,
      parent_id: newCatParent || undefined,
    })
    if (data) { setNewCatName(''); await loadCategories() }
    setAddingCat(false)
  }

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id)
    await loadCategories()
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const groups = allCats.filter(c => !c.parent_id)

  if (loading) return (
    <div className="p-4 space-y-2">
      {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-slate-800" />)}
    </div>
  )

  return (
    <div className="pb-8 bg-app min-h-full">

      {/* ── Profile row ── */}
      <Section>
        <SettingRow icon="👤" title={fullName || 'Name'} subtitle={user?.email ?? ''}>
          <input
            className="bg-transparent text-slate-300 text-sm text-right focus:outline-none w-36"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            onBlur={() => saveProfile({ full_name: fullName })}
            placeholder="Your name"
          />
        </SettingRow>
      </Section>

      {/* ── Finance settings ── */}
      <Section>
        <SettingRow icon="💰" title="Monthly Budget" subtitle={budgetEnabled ? `BHD ${Number(monthlyBudget || 0).toLocaleString()}` : 'OFF'}>
          <div className="flex items-center gap-2">
            {budgetEnabled && (
              <input
                className="bg-slate-700 text-slate-200 text-sm text-right focus:outline-none w-24 px-2 py-1 rounded-lg"
                type="number"
                value={monthlyBudget}
                onChange={e => setMonthlyBudget(e.target.value)}
                onBlur={handleSaveProfile}
                placeholder="0"
              />
            )}
            <Toggle
              value={budgetEnabled}
              onChange={v => { setBudgetEnabled(v); if (!v) saveProfile({ monthly_budget: 0 }) }}
            />
          </div>
        </SettingRow>

        <SettingRow icon="🌐" title="Selected Currency" subtitle={CURRENCIES.find(c => c.code === currency)?.label ?? currency}>
          <select
            className="bg-transparent text-slate-400 text-sm focus:outline-none cursor-pointer appearance-none"
            value={currency}
            onChange={e => { setCurrency(e.target.value); saveProfile({ currency: e.target.value }) }}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code} className="bg-slate-900">{c.label}</option>
            ))}
          </select>
        </SettingRow>

        <SettingRow icon="📅" title="Month Start Day" subtitle={`Day ${monthStartDay} of each month`}>
          <input
            className="bg-slate-700 text-slate-200 text-sm text-center focus:outline-none w-12 px-2 py-1 rounded-lg"
            type="number"
            min={1}
            max={28}
            value={monthStartDay}
            onChange={e => setMonthStartDay(Number(e.target.value))}
            onBlur={() => saveProfile({ month_start_day: monthStartDay })}
          />
        </SettingRow>

        <SettingRow icon="🗓️" title="Start Month" subtitle={MONTHS[startMonth - 1]}>
          <select
            className="bg-transparent text-slate-400 text-sm focus:outline-none cursor-pointer appearance-none"
            value={startMonth}
            onChange={e => { setStartMonth(Number(e.target.value)); saveProfile({ start_month: Number(e.target.value) }) }}
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1} className="bg-slate-900">{m}</option>
            ))}
          </select>
        </SettingRow>
      </Section>

      {/* ── Appearance & Privacy ── */}
      <Section>
        <SettingRow icon={isDark ? '☀️' : '🌙'} title="Theme Mode" subtitle={isDark ? 'Dark' : 'Light'}>
          <Toggle value={isDark} onChange={toggleTheme} />
        </SettingRow>

        <SettingRow icon="🙈" title="Hide Amounts" subtitle="Hide amounts while showing the app to others">
          <Toggle
            value={hideAmounts}
            onChange={v => { setHideAmounts(v); saveProfile({ hide_amounts: v }) }}
          />
        </SettingRow>
      </Section>

      {/* ── Categories ── */}
      <Section>
        <button
          onClick={() => setShowCatSection(s => !s)}
          className="w-full flex items-center gap-3 px-4 py-4"
        >
          <span className="text-xl w-7 text-center">🏷️</span>
          <div className="flex-1 text-left">
            <p className="text-slate-200 text-sm font-medium">Categories</p>
            <p className="text-slate-500 text-xs mt-0.5">{allCats.length} categories configured</p>
          </div>
          <span className="text-slate-500 text-sm">{showCatSection ? '▾' : '›'}</span>
        </button>

        {showCatSection && (
          <div className="border-t border-slate-800 px-4 py-3 space-y-3">
            {/* Add new */}
            <div className="space-y-2 bg-slate-800/60 rounded-xl p-3">
              <p className="text-xs text-slate-400 font-medium">Add Category</p>
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  type="text"
                  placeholder="Category name"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={e => setNewCatColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-slate-600 bg-slate-700 cursor-pointer p-1"
                />
              </div>
              <select className="input text-sm" value={newCatParent} onChange={e => setNewCatParent(e.target.value)}>
                <option value="">Top-level group (no parent)</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button className="btn-primary w-full text-sm py-2" onClick={handleAddCategory} disabled={addingCat}>
                {addingCat ? 'Adding…' : '+ Add'}
              </button>
            </div>

            {/* Category tree */}
            <div className="space-y-1 max-h-[32rem] overflow-y-auto">
              {tree.map(({ group, children }) => (
                <div key={group.id}>
                  {/* ── Parent group ── */}
                  <div
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg"
                    style={{ borderLeft: `3px solid ${group.color}` }}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                    <span className="text-sm font-bold text-slate-100 uppercase tracking-wide flex-1">{group.name}</span>
                    <span className="text-xs text-slate-500">{children.length}</span>
                  </div>

                  {/* ── Sub-categories ── */}
                  <div className="ml-4 border-l border-slate-700/60 mb-2">
                    {children.map(cat => (
                      <div key={cat.id} className="flex items-center gap-2 pl-4 pr-2 py-1.5 hover:bg-slate-700/20 rounded-r-lg group">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm text-slate-300 flex-1">{cat.name}</span>
                        {cat.is_income && <span className="text-xs text-green-500 px-1">income</span>}
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs px-1.5 py-0.5 rounded"
                        >✕</button>
                      </div>
                    ))}
                    {children.length === 0 && (
                      <p className="pl-4 py-1.5 text-xs text-slate-600 italic">No sub-categories</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── About ── */}
      <Section>
        <SettingRow icon="ℹ️" title="FinArt Web" subtitle={`Connected to Supabase · ${allCats.length} categories`} />
      </Section>

      {/* ── Save button (shown when dirty) ── */}
      {saving && (
        <div className="px-4">
          <div className="btn-primary w-full text-center py-3 text-sm opacity-60">Saving…</div>
        </div>
      )}
      {saved && (
        <div className="px-4">
          <div className="btn-primary w-full text-center py-3 text-sm">✓ Saved</div>
        </div>
      )}

      {/* ── Sign Out ── */}
      <div className="px-4 pb-8 pt-2">
        <button
          onClick={handleSignOut}
          className="w-full py-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-base tracking-wide hover:bg-red-500/25 active:bg-red-500/35 transition-colors flex items-center justify-center gap-3"
        >
          <span className="text-xl">🚪</span>
          Sign Out
        </button>
      </div>
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 my-3 rounded-2xl overflow-hidden divide-y" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', border: '1px solid var(--border)' }}>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>{children}</div>
    </div>
  )
}

function SettingRow({ icon, title, subtitle, children }: {
  icon: string
  title: string
  subtitle?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <span className="text-xl w-7 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-slate-200 text-sm font-medium">{title}</p>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5 truncate">{subtitle}</p>}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors ${value ? 'bg-purple-500' : 'bg-slate-600'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`}
      />
    </button>
  )
}
