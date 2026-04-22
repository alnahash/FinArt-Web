import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp, getCategories } from '../services/db'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { data, error: err } = await signIn(email, password)
        if (err) throw err
        // Seed categories if missing (e.g. signup happened before categories were created)
        if (data.user) {
          const { data: cats } = await getCategories(data.user.id)
          if (!cats || cats.length === 0) {
            try { await supabase.rpc('create_default_categories', { p_user_id: data.user.id }) } catch { /* ignore */ }
          }
        }
      } else {
        const { error: err } = await signUp(email, password, fullName)
        if (err) throw err
      }
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-indigo-400">FinArt</h1>
          <p className="text-slate-400 text-sm mt-1">Personal Finance Manager</p>
        </div>

        {/* Card */}
        <div className="card space-y-4">
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-600 text-sm">
            {(['login', 'signup'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 font-medium transition-colors capitalize ${
                  mode === m ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                className="input"
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            )}
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>
        </div>

        {mode === 'signup' && (
          <p className="text-center text-xs text-slate-500">
            After signing up, check your email to confirm your account.
          </p>
        )}
      </div>
    </div>
  )
}
