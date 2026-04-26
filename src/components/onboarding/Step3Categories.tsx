import { useState } from 'react'
import { updateCategory } from '../../services/db'
import type { Category } from '../../types'

interface Step3CategoriesProps {
  categories: Category[]
  userId: string
  onCategoryUpdate: (category: Category) => void
  onNext: () => void
}

export default function Step3Categories({
  categories,
  userId,
  onCategoryUpdate,
  onNext,
}: Step3CategoriesProps) {
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  // Get main categories only (no parent_id)
  const mainCategories = categories.filter(c => !c.parent_id)

  const handleEditStart = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
    setEditColor(category.color || '#6366f1')
  }

  const handleEditSave = async (categoryId: string) => {
    try {
      setLoading(true)
      const { error } = await updateCategory(categoryId, {
        name: editName,
        color: editColor,
      })
      if (error) throw error

      const updatedCat = mainCategories.find(c => c.id === categoryId)
      if (updatedCat) {
        onCategoryUpdate({ ...updatedCat, name: editName, color: editColor })
      }

      setEditingId(null)
    } catch (err) {
      console.error('Failed to update category:', err)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = [
    '#f97316', // orange
    '#8b5cf6', // purple
    '#3b82f6', // blue
    '#eab308', // yellow
    '#ec4899', // pink
    '#ef4444', // red
    '#10b981', // emerald
    '#6b7280', // gray
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        View and customize your expense categories. Click on any category to edit.
      </p>

      {/* Categories Grid */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {mainCategories.map(category => (
          <div key={category.id}>
            {editingId === category.id ? (
              // Edit Mode
              <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 space-y-2">
                <div>
                  <label className="text-xs text-slate-400">Category Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="input mt-1"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Color</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          editColor === color
                            ? 'border-white scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditSave(category.id)}
                    disabled={loading}
                    className="flex-1 px-2 py-1 bg-indigo-500 hover:bg-indigo-600 rounded text-sm text-white transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    disabled={loading}
                    className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <button
                onClick={() => handleEditStart(category)}
                disabled={loading || editingId !== null}
                className="w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50"
              >
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color || '#6366f1' }}
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-slate-200">{category.name}</p>
                  {category.is_income && <p className="text-xs text-emerald-400">Income</p>}
                </div>
                <span className="text-slate-500 text-lg">→</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
        <p className="text-xs text-slate-400">
          💡 <strong>Tip:</strong> Customize category names and colors to match your preferences. Subcategories will inherit the main category color.
        </p>
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={loading}
        className="btn-primary w-full mt-6"
      >
        {loading ? 'Saving...' : 'Continue →'}
      </button>
    </div>
  )
}
