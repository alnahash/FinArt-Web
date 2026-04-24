import { useState, useRef, useEffect } from 'react'
import type { CategoryGroup } from '../types'

interface Props {
  value: string
  onChange: (value: string) => void
  tree: CategoryGroup[]
}

export default function CategoryDropdown({ value, onChange, tree }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel = value
    ? tree.flatMap(g => g.children).find(c => c.id === value)?.name
    : 'All categories'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="input text-sm text-left flex items-center justify-between"
        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border)' }}
      >
        <span>{selectedLabel}</span>
        <span className="text-xs">▼</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
          >
            All categories
          </button>

          {tree.map(group => (
            group.children.length > 0 ? (
              <div key={group.group.id}>
                <div className="px-4 py-2 text-xs font-semibold text-slate-400 bg-slate-900/50">{group.group.name}</div>
                {group.children.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { onChange(cat.id); setOpen(false) }}
                    className={`w-full text-left px-6 py-2 text-sm transition-colors ${
                      value === cat.id
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'text-slate-200 hover:bg-slate-700/30'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            ) : null
          ))}
        </div>
      )}
    </div>
  )
}
