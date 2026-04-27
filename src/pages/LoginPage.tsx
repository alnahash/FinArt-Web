import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signUp, getCategories, resetPassword, signInWithGoogle, getProfile } from '../services/db'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setInfo('')
    setEmail('')
    setConfirmEmail('')
    setPassword('')
    setConfirmPassword('')
    setFirstName('')
    setLastName('')
    setAgreeToTerms(false)
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      const { error: err } = await signInWithGoogle()
      if (err) throw err
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setLoading(false)
    }
  }

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
          // Check if user has 2FA enabled
          const { data: profile } = await getProfile(data.user.id)

          const { data: cats } = await getCategories(data.user.id)
          if (!cats || cats.length === 0) {
            try { await supabase.rpc('create_default_categories', { p_user_id: data.user.id }) } catch { /* ignore */ }
          }

          // Redirect to 2FA verification if 2FA is enabled
          if (profile?.two_fa_enabled && profile?.two_fa_verified) {
            navigate('/login/2fa-verify', { state: { userId: data.user.id, email: data.user.email } })
          } else {
            navigate('/dashboard')
          }
        }
      } else {
        // Validation for signup
        if (!firstName.trim()) throw new Error('First name is required')
        if (!lastName.trim()) throw new Error('Last name is required')
        if (email !== confirmEmail) throw new Error('Emails do not match')
        if (password !== confirmPassword) throw new Error('Passwords do not match')
        if (password.length < 6) throw new Error('Password must be at least 6 characters')
        if (!agreeToTerms) throw new Error('You must agree to the terms and conditions')

        const fullName = `${firstName.trim()} ${lastName.trim()}`
        const { error: err } = await signUp(email, password, fullName)
        if (err) throw err
        setInfo('Account created — check your email to confirm before signing in.')
        setLoading(false)
        return
      }
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
              <>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" type="text" placeholder="First Name" value={firstName}
                    onChange={e => setFirstName(e.target.value)} required />
                  <input className="input" type="text" placeholder="Last Name" value={lastName}
                    onChange={e => setLastName(e.target.value)} required />
                </div>
                <input className="input" type="email" placeholder="Email" value={email}
                  onChange={e => setEmail(e.target.value)} required />
                <input className="input" type="email" placeholder="Confirm Email" value={confirmEmail}
                  onChange={e => setConfirmEmail(e.target.value)} required />
                <input className="input" type="password" placeholder="Password" value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={6} />
                <input className="input" type="password" placeholder="Confirm Password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
              </>
            )}
            {mode !== 'signup' && (
              <>
                <input className="input" type="email" placeholder="Email" value={email}
                  onChange={e => setEmail(e.target.value)} required />
                {mode !== 'forgot' && (
                  <input className="input" type="password" placeholder="Password" value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={6} />
                )}
              </>
            )}

            {mode === 'signup' && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  By creating an account, you agree to our Terms of Service and Privacy Policy. We respect your privacy and will only use your information to provide and improve our services.
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreeToTerms} onChange={e => setAgreeToTerms(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
                  <span className="text-xs text-slate-400">I agree to the Terms of Service and Privacy Policy</span>
                </label>
              </div>
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-slate-900 text-slate-500">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-600 rounded-lg hover:border-slate-500 hover:bg-slate-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-slate-300">Google</span>
          </button>

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
