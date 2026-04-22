import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getProfile, updateProfile, signOut, getCategories, createCategory, deleteCategory } from '../services/db'
import type { Profile, Category } from '../types'

export default function SettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [fullName, setFullName] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [addingCat, setAddingCat] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getProfile(user.id),
      getCategories(user.id),
    ]).then(([profileRes, catsRes]) => {
      const p = profileRes.data
      if (p) {
        setProfile(p)
        setFullName(p.full_name ?? '')
        setMonthlyBudget(String(p.monthly_budget ?? ''))
      }
      setCategories(catsRes.data ?? [])
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
    const { data } = await createCategory(user.id, { name: newCatName.trim(), color: newCatColor })
    if (data) setCategories(prev => [...prev, data])
    setNewCatName('')
    setAddingCat(false)
  }

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

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
          <input
            className="input mt-1"
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Monthly Budget (₹)</label>
          <input
            className="input mt-1"
            type="number"
            value={monthlyBudget}
            onChange={e => setMonthlyBudget(e.target.value)}
            placeholder="0"
          />
        </div>
        <button className="btn-primary w-full" onClick={handleSaveProfile} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Profile'}
        </button>
      </div>

      {/* Categories */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-200">Categories</h3>

        {/* Add new */}
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            type="text"
            placeholder="New category name"
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
          <button className="btn-primary text-sm px-3" onClick={handleAddCategory} disabled={addingCat}>
            {addingCat ? '…' : '+'}
          </button>
        </div>

        {/* List */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-slate-700/50 group">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-sm text-slate-200 flex-1">{cat.name}</span>
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* App info */}
      <div className="card space-y-1 text-sm text-slate-400">
        <h3 className="font-semibold text-slate-200 mb-2">About</h3>
        <p>FinArt Web — Personal Finance Manager</p>
        <p>Connected to Supabase FinMgmt project</p>
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
