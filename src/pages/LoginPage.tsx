import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp, getCategories, resetPassword } from '../services/db'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const switchMode = (m: Mode) => { setMode(m); setError(''); setInfo('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setInfo('')
    setLoading(true)
    try {
      if (mode === 'forgot') {
        const { error: err } = await resetPassword(email)
        if (err) throw err
        setInfo('Password reset email sent — check your inbox.')
        setLoading(false)
        return
      }
      if (mode === 'login') {
        const { data, error: err } = await signIn(email, password)
        if (err) throw err
        if (data.user) {
          const { data: cats } = await getCategories(data.user.id)
          if (!cats || cats.length === 0) {
            try { await supabase.rpc('create_default_categories', { p_user_id: data.user.id }) } catch { /* ignore */ }
          }
        }
      } else {
        const { error: err } = await signUp(email, password, fullName)
        if (err) throw err
        setInfo('Account created — check your email to confirm before signing in.')
        setLoading(false)
        return
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
        <div className="text-center">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-indigo-400">FinArt</h1>
          <p className="text-slate-400 text-sm mt-1">Personal Finance Manager</p>
        </div>

        <div className="card space-y-4">
          {mode !== 'forgot' && (
            <div className="flex rounded-xl overflow-hidden border border-slate-600 text-sm">
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2 font-medium transition-colors capitalize ${
                    mode === m ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div className="flex items-center gap-2">
              <button onClick={() => switchMode('login')} className="text-slate-400 hover:text-slate-200 text-lg">‹</button>
              <h2 className="font-semibold text-slate-200">Reset Password</h2>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input className="input" type="text" placeholder="Full Name" value={fullName}
                onChange={e => setFullName(e.target.value)} required />
            )}
            <input className="input" type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required />
            {mode !== 'forgot' && (
              <input className="input" type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} required minLength={6} />
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-red-400 text-sm">{error}</div>
            )}
            {info && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2 text-green-400 text-sm">{info}</div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'forgot' ? 'Sending…' : mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                mode === 'forgot' ? 'Send Reset Email' : mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {mode === 'login' && (
            <button onClick={() => switchMode('forgot')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors py-1">
              Forgot password?
            </button>
          )}
        </div>

        {mode === 'signup' && (
          <p className="text-center text-xs text-slate-500">After signing up, check your email to confirm your account.</p>
        )}
      </div>
    </div>
  )
}
