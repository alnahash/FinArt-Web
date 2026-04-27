import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTwoFA } from '../hooks/useTwoFA'
import * as totp from '../lib/totp'

type Step = 1 | 2 | 3 | 4 | 5

interface SetupState {
  secret?: { secret: string; qrCode: string; manualEntry: string }
  backupCodes?: string[]
  otpVerified?: boolean
}

export default function TwoFASetupPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { initiateTwoFASetup, verifyAndEnableTwoFA } = useTwoFA()

  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<SetupState>({})
  const [verificationCode, setVerificationCode] = useState('')
  const [manualEntryVisible, setManualEntryVisible] = useState(false)
  const [backupCodesAcknowledged, setBackupCodesAcknowledged] = useState(false)

  const handleNext = async () => {
    setError(null)

    if (currentStep === 1) {
      // Initiate setup
      try {
        setLoading(true)
        const secret = await initiateTwoFASetup()
        setState(prev => ({ ...prev, secret }))
        setCurrentStep(2)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate secret')
      } finally {
        setLoading(false)
      }
    } else if (currentStep === 2) {
      setCurrentStep(3)
    } else if (currentStep === 3) {
      // Verify OTP
      if (!state.secret) {
        setError('Secret not found')
        return
      }

      if (verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
        setError('Please enter a valid 6-digit code')
        return
      }

      try {
        setLoading(true)
        const isValid = totp.verifyToken(state.secret.secret, verificationCode)

        if (!isValid) {
          setError('Invalid code. Please try again.')
          setVerificationCode('')
          return
        }

        setState(prev => ({ ...prev, otpVerified: true }))
        setCurrentStep(4)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed')
      } finally {
        setLoading(false)
      }
    } else if (currentStep === 4) {
      // Verify backup codes acknowledged
      if (!backupCodesAcknowledged) {
        setError('Please confirm you have saved your backup codes')
        return
      }
      setCurrentStep(5)
    } else if (currentStep === 5) {
      // Complete setup
      try {
        setLoading(true)

        if (!state.secret || !state.backupCodes) {
          setError('Setup state invalid')
          return
        }

        await verifyAndEnableTwoFA(state.secret.secret, verificationCode)
        navigate('/settings')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete setup')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 4) {
        setCurrentStep(3)
      } else {
        setCurrentStep((currentStep - 1) as Step)
      }
      setError(null)
    }
  }

  const handleCancel = () => {
    navigate('/settings')
  }

  const handlePreviousStep = () => {
    if (currentStep === 3) {
      setCurrentStep(2)
      setVerificationCode('')
      setError(null)
    } else if (currentStep > 1) {
      handleBack()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="flex justify-between mb-8">
          {[1, 2, 3, 4, 5].map(step => (
            <div
              key={step}
              className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
                step <= currentStep ? 'bg-indigo-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="card space-y-6">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <>
              <h1 className="text-3xl font-bold text-white">Set up Two-Factor Authentication</h1>
              <div className="space-y-4 text-slate-300">
                <p>
                  Two-factor authentication (2FA) adds an extra layer of security to your account by requiring a code from an authenticator app in addition to your password.
                </p>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-white">Recommended authenticator apps:</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      <span>Google Authenticator (iOS & Android)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      <span>Microsoft Authenticator (iOS & Android)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      <span>Authy (iOS & Android)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Step 2: QR Code */}
          {currentStep === 2 && state.secret && (
            <>
              <h1 className="text-3xl font-bold text-white">Scan QR Code</h1>
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <img
                      src={state.secret.qrCode}
                      alt="2FA QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-slate-400">
                    Open your authenticator app and scan this QR code
                  </p>
                  {!manualEntryVisible ? (
                    <button
                      onClick={() => setManualEntryVisible(true)}
                      className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
                    >
                      Can't scan? Enter manually →
                    </button>
                  ) : (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-2">Manual entry key:</p>
                      <code className="text-lg font-mono text-yellow-400 break-all">
                        {state.secret.manualEntry}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(state.secret!.manualEntry)
                        }}
                        className="mt-2 text-xs text-slate-400 hover:text-slate-300"
                      >
                        Copy to clipboard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Verify Code */}
          {currentStep === 3 && state.secret && (
            <>
              <h1 className="text-3xl font-bold text-white">Verify Code</h1>
              <p className="text-slate-400">
                Enter the 6-digit code from your authenticator app to confirm it's working correctly.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="verify-code" className="block text-sm font-medium text-slate-300 mb-2">
                    6-digit code
                  </label>
                  <input
                    id="verify-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    placeholder="000000"
                    className="input w-full text-2xl text-center tracking-widest font-mono"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 4: Backup Codes */}
          {currentStep === 4 && state.backupCodes && (
            <>
              <h1 className="text-3xl font-bold text-white">Save Backup Codes</h1>
              <p className="text-slate-400">
                Save these backup codes in a safe place. Each code can be used once to sign in if you lose access to your authenticator app.
              </p>

              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-3 font-mono text-sm text-yellow-400">
                  {state.backupCodes.map((code, idx) => (
                    <div key={idx} className="bg-slate-900/50 p-2 rounded text-center">
                      {code.substring(0, 4)}-{code.substring(4)}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const formattedCodes = state.backupCodes!.map(c => `${c.substring(0, 4)}-${c.substring(4)}`).join('\n')
                    navigator.clipboard.writeText(formattedCodes)
                  }}
                  className="mt-4 w-full text-sm text-slate-400 hover:text-slate-300 transition-colors py-2 border border-slate-700 rounded-lg"
                >
                  Copy all codes
                </button>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-400">
                ⚠️ Each code can only be used once. Do not share these codes with anyone.
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={backupCodesAcknowledged}
                  onChange={e => {
                    setBackupCodesAcknowledged(e.target.checked)
                    setError(null)
                  }}
                  className="w-4 h-4 rounded"
                />
                <span className="text-slate-300">I have saved my backup codes in a secure location</span>
              </label>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
            </>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <>
              <div className="text-center space-y-6">
                <div className="text-6xl">✓</div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-white">2FA is now enabled!</h1>
                  <p className="text-slate-400">
                    Your account is now protected with two-factor authentication.
                  </p>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-sm text-green-400">
                  You will be asked to enter a code from your authenticator app the next time you log in.
                </div>
              </div>
            </>
          )}

          {/* Error message for general issues */}
          {error && currentStep !== 3 && currentStep !== 4 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-between border-t border-slate-700 pt-6">
            <div className="flex gap-3">
              {currentStep > 1 && currentStep < 5 && (
                <button
                  onClick={currentStep === 3 ? handlePreviousStep : handleBack}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {currentStep < 5 && (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={loading || (currentStep === 4 && !backupCodesAcknowledged)}
                    className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    {loading ? 'Loading...' : currentStep === 4 ? 'Complete Setup' : 'Next'}
                  </button>
                </>
              )}
              {currentStep === 5 && (
                <button
                  onClick={() => navigate('/settings')}
                  className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors active:scale-95"
                >
                  Back to Settings
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
