import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getProfile, updateProfile, signOut, getCategories, createCategory, deleteCategory, buildCategoryTree } from '../services/db'
import type { Profile, Category, CategoryGroup } from '../types'

export default function SettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tree, setTree] = useState<CategoryGroup[]>([])
  const [allCats, setAllCats] = useState<Category[]>([])
  const [fullName, setFullName] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [newCatParent, setNewCatParent] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

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
      if (p) { setProfile(p); setFullName(p.full_name ?? ''); setMonthlyBudget(String(p.monthly_budget ?? '')) }
      const cats = catsRes.data ?? []
      setAllCats(cats)
      setTree(buildCategoryTree(cats))
      setLoading(false)
    })
  }, [user])

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    await updateProfile(user.id, { full_name: fullName, monthly_budget: Number(monthlyBudget) || 0 })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
    <div className="p-4 space-y-4">
      {[0, 1, 2].map(i => <div key={i} className="card h-32 animate-pulse bg-slate-700" />)}
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      {/* Profile */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-200">Profile</h3>
        <div>
          <label className="text-xs text-slate-400">Email</label>
          <p className="text-sm text-slate-300 mt-0.5">{user?.email}</p>
        </div>
        <div>
          <label className="text-xs text-slate-400">Full Name</label>
          <input className="input mt-1" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <label className="text-xs text-slate-400">Monthly Budget (₹)</label>
          <input className="input mt-1" type="number" value={monthlyBudget} onChange={e => setMonthlyBudget(e.target.value)} placeholder="0" />
        </div>
        <button className="btn-primary w-full" onClick={handleSaveProfile} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Profile'}
        </button>
      </div>

      {/* Categories */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-200">Categories</h3>

        {/* Add new */}
        <div className="space-y-2 bg-slate-700/40 rounded-xl p-3">
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

        {/* Grouped list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tree.map(({ group, children }) => (
            <div key={group.id} className="rounded-xl overflow-hidden border border-slate-700">
              {/* Group row */}
              <button
                onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-700/60 hover:bg-slate-700 transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                <span className="text-sm font-semibold text-slate-200 flex-1 text-left tracking-wide">{group.name}</span>
                <span className="text-xs text-slate-400">{children.length}</span>
                <span className="text-slate-500 text-xs">{expandedGroup === group.id ? '▾' : '›'}</span>
              </button>
              {/* Children */}
              {expandedGroup === group.id && (
                <div className="divide-y divide-slate-700/50">
                  {children.map(cat => (
                    <div key={cat.id} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-700/30 group">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm text-slate-300 flex-1">{cat.name}</span>
                      {cat.is_income && <span className="text-xs text-green-500">income</span>}
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs px-1.5 py-0.5 rounded"
                      >✕</button>
                    </div>
                  ))}
                  {children.length === 0 && (
                    <p className="px-4 py-2 text-xs text-slate-500">No sub-categories yet</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="card space-y-1 text-sm text-slate-400">
        <h3 className="font-semibold text-slate-200 mb-2">About</h3>
        <p>FinArt Web — Personal Finance Manager</p>
        <p>Connected to Supabase · {allCats.length} categories</p>
        <p className="text-xs">Data syncs with your Android FinArt app</p>
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-red-400 hover:bg-red-500/10 transition-colors border border-slate-700"
      >
        Sign Out
      </button>
    </div>
  )
}
