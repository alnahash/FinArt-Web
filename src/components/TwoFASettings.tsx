import { useState } from 'react'
import { useTwoFA } from '../hooks/useTwoFA'

interface TwoFASettingsProps {
  onSetupClick?: () => void
  onDisableClick?: () => void
  onOpenBackupCodes?: () => void
}

export default function TwoFASettings({
  onSetupClick,
  onDisableClick,
  onOpenBackupCodes,
}: TwoFASettingsProps) {
  const { twoFAEnabled, twoFAVerified, loading } = useTwoFA()
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  const handleDisableClick = async () => {
    if (showDisableConfirm && onDisableClick) {
      onDisableClick()
      setShowDisableConfirm(false)
    } else {
      setShowDisableConfirm(true)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-200">Two-Factor Authentication</h3>
          <p className="text-sm text-slate-400 mt-1">
            Add an extra layer of security to your account
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              twoFAEnabled && twoFAVerified
                ? 'bg-green-500/10 text-green-400'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {twoFAEnabled && twoFAVerified ? '✓ Enabled' : 'Disabled'}
          </div>
        </div>
      </div>

      {twoFAEnabled && twoFAVerified && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
          <p className="text-sm text-slate-300">
            Your account is protected with two-factor authentication using an authenticator app.
          </p>
          <div className="flex gap-2">
            {onOpenBackupCodes && (
              <button
                onClick={onOpenBackupCodes}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                View Backup Codes
              </button>
            )}
            <button
              onClick={handleDisableClick}
              disabled={loading}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showDisableConfirm ? 'Confirm Disable' : 'Disable 2FA'}
            </button>
            {showDisableConfirm && (
              <button
                onClick={() => setShowDisableConfirm(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
          {showDisableConfirm && (
            <p className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
              Disabling 2FA will remove the extra security from your account. Are you sure?
            </p>
          )}
        </div>
      )}

      {!twoFAEnabled && (
        <button
          onClick={onSetupClick}
          disabled={loading}
          className="w-full px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {loading ? 'Setting up...' : 'Enable 2FA'}
        </button>
      )}
    </div>
  )
}
