import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { getProfile, updateProfile, signOut, getCategories, createCategory, updateCategory, deleteCategory, reorderCategories, buildCategoryTree } from '../services/db'
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
  const [newCatType, setNewCatType] = useState<'none' | 'one_time' | 'monthly' | 'weekly'>('none')
  const [newCatIsIncome, setNewCatIsIncome] = useState(false)
  const [addTab, setAddTab] = useState<'main' | 'sub'>('main')
  const [addingCat, setAddingCat] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCatSection, setShowCatSection] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#6366f1')
  const [editIsIncome, setEditIsIncome] = useState(false)
  const [editRecurrenceType, setEditRecurrenceType] = useState<'none' | 'one_time' | 'monthly' | 'weekly'>('none')
  const [savingEdit, setSavingEdit] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

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
      parent_id: addTab === 'sub' ? (newCatParent || undefined) : undefined,
      recurrence_type: newCatType,
      is_income: addTab === 'main' ? newCatIsIncome : undefined,
    })
    if (data) { setNewCatName(''); setNewCatType('none'); await loadCategories() }
    setAddingCat(false)
  }

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color)
    setEditIsIncome(cat.is_income)
    setEditRecurrenceType(cat.recurrence_type)
  }

  const handleSaveEdit = async (cat: Category) => {
    setSavingEdit(true)
    const updates: Parameters<typeof updateCategory>[1] = { name: editName.trim() || cat.name, color: editColor }
    if (!cat.parent_id) updates.is_income = editIsIncome
    else updates.recurrence_type = editRecurrenceType
    await updateCategory(cat.id, updates)
    setEditingId(null)
    setSavingEdit(false)
    await loadCategories()
  }

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id)
    await loadCategories()
  }

  const handleDrop = async (draggedCat: Category, targetCat: Category) => {
    if (draggedCat.id === targetCat.id) return
    if (draggedCat.parent_id !== targetCat.parent_id) return
    if (!draggedCat.parent_id && draggedCat.is_income !== targetCat.is_income) return

    let items: Category[]
    if (!draggedCat.parent_id) {
      items = tree.filter(({ group }) => !!group.is_income === draggedCat.is_income).map(({ group }) => group)
    } else {
      const parent = tree.find(({ group }) => group.id === draggedCat.parent_id)
      if (!parent) return
      items = parent.children
    }

    const from = items.findIndex(c => c.id === draggedCat.id)
    const to = items.findIndex(c => c.id === targetCat.id)
    const reordered = [...items]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)

    await reorderCategories(reordered.map((cat, i) => ({ id: cat.id, sort_order: i })))
    setDragId(null)
    setDragOverId(null)
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
            <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>Categories</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{allCats.length} categories configured</p>
          </div>
          <span className="text-sm" style={{ color: 'var(--text-3)' }}>{showCatSection ? '▾' : '›'}</span>
        </button>

        {showCatSection && (
          <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: 'var(--border)' }}>

            {/* ── Add form ── */}
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
                {(['main', 'sub'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAddTab(tab)}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      addTab === tab
                        ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500'
                        : 'text-secondary hover:text-primary'
                    }`}
                  >
                    {tab === 'main' ? '📁 Main Category' : '📄 Sub-Category'}
                  </button>
                ))}
              </div>

              <div className="p-3 space-y-2.5" style={{ backgroundColor: 'var(--bg-muted)' }}>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    type="text"
                    placeholder={addTab === 'main' ? 'Main category name…' : 'Sub-category name…'}
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                  />
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={e => setNewCatColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border cursor-pointer p-1 flex-shrink-0"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
                  />
                </div>

                {addTab === 'main' && (
                  <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={() => setNewCatIsIncome(false)}
                      className={`flex-1 py-2 text-sm font-semibold transition-colors ${!newCatIsIncome ? 'bg-red-500/20 text-red-400' : 'text-secondary hover:text-primary'}`}
                      style={newCatIsIncome ? { backgroundColor: 'var(--bg-input)' } : {}}
                    >📉 Expense</button>
                    <button
                      onClick={() => setNewCatIsIncome(true)}
                      className={`flex-1 py-2 text-sm font-semibold transition-colors ${newCatIsIncome ? 'bg-green-500/20 text-green-400' : 'text-secondary hover:text-primary'}`}
                      style={!newCatIsIncome ? { backgroundColor: 'var(--bg-input)' } : {}}
                    >📈 Income</button>
                  </div>
                )}

                {addTab === 'sub' && (
                  <select
                    className="input text-sm"
                    value={newCatParent}
                    onChange={e => setNewCatParent(e.target.value)}
                  >
                    <option value="">— Select main category —</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                )}

                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Type</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { value: 'none',     label: '— None' },
                      { value: 'one_time', label: '1️⃣ One Time' },
                      { value: 'monthly',  label: '🔁 Monthly' },
                      { value: 'weekly',   label: '🔁 Weekly' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setNewCatType(opt.value)}
                        className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                          newCatType === opt.value
                            ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                            : 'border-transparent text-secondary hover:text-primary'
                        }`}
                        style={newCatType !== opt.value ? { backgroundColor: 'var(--bg-input)' } : {}}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>

                <button
                  className="btn-primary w-full text-sm py-2.5"
                  onClick={handleAddCategory}
                  disabled={addingCat || !newCatName.trim() || (addTab === 'sub' && !newCatParent)}
                >
                  {addingCat ? 'Adding…' : `+ Add ${addTab === 'main' ? 'Main Category' : 'Sub-Category'}`}
                </button>
              </div>
            </div>

            {/* ── Category tree ── */}
            <div className="space-y-4 max-h-[36rem] overflow-y-auto">
              {(['expense', 'income'] as const).map(kind => {
                const isIncome = kind === 'income'
                const section = tree.filter(({ group }) => !!group.is_income === isIncome)
                return (
                  <div key={kind}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className={`text-xs font-bold uppercase tracking-widest ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                        {isIncome ? '📈 Income' : '📉 Expenses'}
                      </span>
                      <div className="flex-1 h-px" style={{ backgroundColor: isIncome ? '#22c55e33' : '#ef444433' }} />
                    </div>
                    <div className="space-y-2">
                      {section.length === 0 && (
                        <p className="text-xs italic px-2" style={{ color: 'var(--text-3)' }}>No {kind} categories yet</p>
                      )}
                      {section.map(({ group, children }, groupIdx) => (
                        <div
                          key={group.id}
                          className={`rounded-xl overflow-hidden border transition-opacity ${dragId && dragId !== group.id && !children.some(c => c.id === dragId) ? 'opacity-60' : ''}`}
                          style={{
                            borderColor: dragOverId === group.id && dragId !== group.id ? group.color : 'var(--border)',
                            borderWidth: dragOverId === group.id && dragId !== group.id ? 2 : 1,
                          }}
                          onDragOver={e => { e.preventDefault(); setDragOverId(group.id) }}
                          onDrop={e => {
                            e.preventDefault()
                            const dragged = allCats.find(c => c.id === dragId)
                            if (dragged) handleDrop(dragged, group)
                          }}
                          onDragLeave={() => setDragOverId(null)}
                        >
                          {/* Main category row / inline edit */}
                          {editingId === group.id ? (
                            <InlineEditForm
                              cat={group}
                              name={editName} onNameChange={setEditName}
                              color={editColor} onColorChange={setEditColor}
                              isIncome={editIsIncome} onIsIncomeChange={setEditIsIncome}
                              recurrenceType={editRecurrenceType} onRecurrenceTypeChange={setEditRecurrenceType}
                              saving={savingEdit}
                              onSave={() => handleSaveEdit(group)}
                              onCancel={() => setEditingId(null)}
                            />
                          ) : (
                            <div
                              draggable
                              onDragStart={() => setDragId(group.id)}
                              onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                              className="flex items-center gap-2 px-2 py-2.5 group cursor-grab active:cursor-grabbing"
                              style={{ backgroundColor: 'var(--bg-surface)', borderLeft: `4px solid ${group.color}` }}
                            >
                              <span className="text-base select-none opacity-30 group-hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: 'var(--text-3)' }}>⠿</span>
                              <span className="text-xs font-bold tabular-nums w-5 flex-shrink-0" style={{ color: group.color }}>{groupIdx + 1}</span>
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                              <span className="text-sm font-bold uppercase tracking-wide flex-1" style={{ color: 'var(--text-1)' }}>
                                {group.name}
                              </span>
                              {group.recurrence_type !== 'none' && <RecurrenceBadge type={group.recurrence_type} />}
                              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-3)' }}>
                                {children.length}
                              </span>
                              <button
                                onClick={() => handleStartEdit(group)}
                                className="text-xs opacity-0 group-hover:opacity-100 hover:text-purple-400 transition-colors"
                                style={{ color: 'var(--text-3)' }}
                              >✎</button>
                              <button
                                onClick={() => handleDeleteCategory(group.id)}
                                className="text-xs opacity-0 group-hover:opacity-100 hover:text-red-400 transition-colors"
                                style={{ color: 'var(--text-3)' }}
                              >✕</button>
                            </div>
                          )}

                          {/* Sub-category rows */}
                          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {children.map((cat, childIdx) => (
                              editingId === cat.id ? (
                                <InlineEditForm
                                  key={cat.id}
                                  cat={cat}
                                  name={editName} onNameChange={setEditName}
                                  color={editColor} onColorChange={setEditColor}
                                  isIncome={editIsIncome} onIsIncomeChange={setEditIsIncome}
                                  recurrenceType={editRecurrenceType} onRecurrenceTypeChange={setEditRecurrenceType}
                                  saving={savingEdit}
                                  onSave={() => handleSaveEdit(cat)}
                                  onCancel={() => setEditingId(null)}
                                  indent
                                />
                              ) : (
                                <div
                                  key={cat.id}
                                  draggable
                                  onDragStart={() => setDragId(cat.id)}
                                  onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverId(cat.id) }}
                                  onDrop={e => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const dragged = allCats.find(c => c.id === dragId)
                                    if (dragged) handleDrop(dragged, cat)
                                  }}
                                  onDragLeave={() => setDragOverId(null)}
                                  className="flex items-center gap-2 pl-6 pr-3 py-2 group cursor-grab active:cursor-grabbing transition-colors"
                                  style={{
                                    backgroundColor: dragOverId === cat.id && dragId !== cat.id ? cat.color + '15' : 'var(--bg-card)',
                                    borderLeft: dragOverId === cat.id && dragId !== cat.id ? `2px solid ${cat.color}` : undefined,
                                  }}
                                >
                                  <span className="text-sm select-none opacity-30 group-hover:opacity-70 transition-opacity flex-shrink-0" style={{ color: 'var(--text-3)' }}>⠿</span>
                                  <span className="text-secondary text-xs flex-shrink-0">└</span>
                                  <span className="text-xs tabular-nums flex-shrink-0" style={{ color: cat.color }}>{groupIdx + 1}.{childIdx + 1}</span>
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                  <span className="text-sm flex-1" style={{ color: 'var(--text-1)' }}>{cat.name}</span>
                                  {cat.recurrence_type !== 'none' && <RecurrenceBadge type={cat.recurrence_type} />}
                                  <button
                                    onClick={() => handleStartEdit(cat)}
                                    className="text-xs opacity-0 group-hover:opacity-100 hover:text-purple-400 transition-colors"
                                    style={{ color: 'var(--text-3)' }}
                                  >✎</button>
                                  <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="text-xs opacity-0 group-hover:opacity-100 hover:text-red-400 transition-colors"
                                    style={{ color: 'var(--text-3)' }}
                                  >✕</button>
                                </div>
                              )
                            ))}
                            {children.length === 0 && (
                              <p className="pl-8 py-2 text-xs italic" style={{ color: 'var(--text-3)', backgroundColor: 'var(--bg-card)' }}>
                                No sub-categories yet
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ── About ── */}
      <Section>
        <SettingRow icon="ℹ️" title="FinArt Web" subtitle={`Connected to Supabase · ${allCats.length} categories`} />
      </Section>

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
        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{title}</p>
        {subtitle && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{subtitle}</p>}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  )
}

const RECURRENCE_LABELS: Record<string, { label: string; color: string }> = {
  one_time: { label: 'One Time',  color: '#f59e0b' },
  monthly:  { label: 'Monthly',   color: '#6366f1' },
  weekly:   { label: 'Weekly',    color: '#10b981' },
}

function RecurrenceBadge({ type }: { type: string }) {
  const info = RECURRENCE_LABELS[type]
  if (!info) return null
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: info.color + '22', color: info.color }}
    >
      {info.label}
    </span>
  )
}

function InlineEditForm({ cat, name, onNameChange, color, onColorChange, isIncome, onIsIncomeChange, recurrenceType, onRecurrenceTypeChange, saving, onSave, onCancel, indent }: {
  cat: Category
  name: string; onNameChange: (v: string) => void
  color: string; onColorChange: (v: string) => void
  isIncome: boolean; onIsIncomeChange: (v: boolean) => void
  recurrenceType: 'none' | 'one_time' | 'monthly' | 'weekly'; onRecurrenceTypeChange: (v: 'none' | 'one_time' | 'monthly' | 'weekly') => void
  saving: boolean
  onSave: () => void
  onCancel: () => void
  indent?: boolean
}) {
  const isMain = !cat.parent_id
  return (
    <div className={`p-3 space-y-2 ${indent ? 'pl-8' : ''}`} style={{ backgroundColor: 'var(--bg-muted)', borderLeft: `4px solid ${color}` }}>
      <div className="flex gap-2">
        <input
          className="input flex-1 text-sm"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
          autoFocus
        />
        <input
          type="color"
          value={color}
          onChange={e => onColorChange(e.target.value)}
          className="w-10 h-10 rounded-xl border cursor-pointer p-1 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
        />
      </div>
      {isMain && (
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => onIsIncomeChange(false)}
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${!isIncome ? 'bg-red-500/20 text-red-400' : 'text-secondary'}`}
            style={isIncome ? { backgroundColor: 'var(--bg-input)' } : {}}
          >📉 Expense</button>
          <button
            onClick={() => onIsIncomeChange(true)}
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${isIncome ? 'bg-green-500/20 text-green-400' : 'text-secondary'}`}
            style={!isIncome ? { backgroundColor: 'var(--bg-input)' } : {}}
          >📈 Income</button>
        </div>
      )}
      {!isMain && (
        <div className="grid grid-cols-4 gap-1">
          {(['none', 'one_time', 'monthly', 'weekly'] as const).map(t => (
            <button
              key={t}
              onClick={() => onRecurrenceTypeChange(t)}
              className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                recurrenceType === t ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'border-transparent text-secondary'
              }`}
              style={recurrenceType !== t ? { backgroundColor: 'var(--bg-input)' } : {}}
            >
              {t === 'none' ? '—' : t === 'one_time' ? '1×' : t === 'monthly' ? '🔁Mo' : '🔁Wk'}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="btn-primary flex-1 text-xs py-2">
          {saving ? 'Saving…' : '✓ Save'}
        </button>
        <button onClick={onCancel} className="flex-1 text-xs py-2 rounded-xl border text-secondary" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-input)' }}>
          Cancel
        </button>
      </div>
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
