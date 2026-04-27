import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import { useTwoFA } from '../hooks/useTwoFA'
import * as db from '../services/db'

export default function TwoFAVerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useProfile()
  const { verifyTwoFAToken, validateBackupCode } = useTwoFA()

  const [code, setCode] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showBackupCode, setShowBackupCode] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [timeoutMinutes, setTimeoutMinutes] = useState(5)

  const email = (location.state?.email || profile?.full_name) || 'your account'

  // Timeout after 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeoutMinutes(prev => {
        if (prev <= 1) {
          navigate('/login', { replace: true })
          return 5
        }
        return prev - 1
      })
    }, 60000)

    return () => clearInterval(timer)
  }, [navigate])

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!profile?.two_fa_secret || !profile?.id) {
      setError('2FA secret not found')
      return
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('Please enter a valid 6-digit code')
      return
    }

    try {
      setLoading(true)

      // Verify the OTP token
      const isValid = verifyTwoFAToken(profile.two_fa_secret, code)

      if (!isValid) {
        const attempts = failedAttempts + 1
        setFailedAttempts(attempts)

        if (attempts >= 5) {
          setShowBackupCode(true)
          setError('Too many failed attempts. Please use a backup code instead.')
        } else {
          setError(
            `Invalid code. ${5 - attempts} attempt${5 - attempts !== 1 ? 's' : ''} remaining.`
          )
        }
        setCode('')
        return
      }

      // Success - redirect to dashboard
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyBackupCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!profile?.backup_codes || !profile?.id) {
      setError('Backup codes not found')
      return
    }

    const backupCodeUpper = backupCode.toUpperCase().replace(/-/g, '')
    if (backupCodeUpper.length !== 8 || !/^[A-Z0-9]{8}$/.test(backupCodeUpper)) {
      setError('Please enter a valid backup code (8 characters)')
      return
    }

    try {
      setLoading(true)

      // Validate backup code
      const result = validateBackupCode(
        profile.backup_codes as string[],
        backupCodeUpper
      )

      if (!result.valid) {
        setError('Invalid backup code')
        setBackupCode('')
        return
      }

      // Update backup codes in database
      if (result.updatedCodes) {
        await db.updateBackupCodes(profile.id, result.updatedCodes)
      }

      // Success - redirect to dashboard
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup code verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-white">Two-Factor Authentication</h1>
            <p className="text-slate-400">
              Enter the code from your authenticator app
            </p>
          </div>

          {/* Main form */}
          {!showBackupCode ? (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              {/* Account indicator */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
                <p className="text-sm text-slate-400">FinArt: {email}</p>
              </div>

              {/* OTP Input */}
              <div>
                <label htmlFor="otp-code" className="block text-sm font-medium text-slate-300 mb-2">
                  6-digit code
                </label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  placeholder="000000"
                  className="input w-full text-2xl text-center tracking-widest font-mono"
                  disabled={loading}
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              {/* Timeout warning */}
              <p className="text-xs text-slate-500 text-center">
                Session expires in {timeoutMinutes} minute{timeoutMinutes !== 1 ? 's' : ''}
              </p>

              {/* Backup code option */}
              <button
                type="button"
                onClick={() => setShowBackupCode(true)}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-300 transition-colors py-2"
              >
                Use a backup code instead
              </button>
            </form>
          ) : (
            /* Backup code form */
            <form onSubmit={handleVerifyBackupCode} className="space-y-4">
              <div>
                <label htmlFor="backup-code" className="block text-sm font-medium text-slate-300 mb-2">
                  Backup code (XXXX-XXXX format)
                </label>
                <input
                  id="backup-code"
                  type="text"
                  value={backupCode}
                  onChange={e => setBackupCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-EFGH"
                  className="input w-full"
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Backup Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowBackupCode(false)
                  setBackupCode('')
                  setError(null)
                }}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-300 transition-colors py-2"
              >
                Back to OTP
              </button>
            </form>
          )}

          {/* Help text */}
          <div className="border-t border-slate-700 pt-4 text-center text-xs text-slate-500">
            <p>If you're having trouble, contact support</p>
          </div>
        </div>
      </div>
    </div>
  )
}
