import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { useProfile } from './useProfile'
import * as db from '../services/db'
import * as totp from '../lib/totp'

export function useTwoFA() {
  const { user } = useAuth()
  const profile = useProfile()

  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [twoFAVerified, setTwoFAVerified] = useState(false)
  const [backupCodesCount, setBackupCodesCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update 2FA status when profile changes
  useEffect(() => {
    if (profile) {
      setTwoFAEnabled(profile.two_fa_enabled ?? false)
      setTwoFAVerified(profile.two_fa_verified ?? false)
      // Backup codes are not returned from profile for security reasons
      // Count is managed through the backup_codes array length
    }
  }, [profile])

  /**
   * Initiate 2FA setup by generating a secret and QR code
   */
  const initiateTwoFASetup = async () => {
    if (!user) throw new Error('User not authenticated')

    try {
      setLoading(true)
      setError(null)

      const secret = await totp.generateSecret(user.email || 'user', 'FinArt')

      // Save the secret temporarily (not yet verified)
      await db.initiateTwoFASetup(user.id, secret.secret)

      return secret
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initiate 2FA setup'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * Verify OTP token and complete 2FA setup
   */
  const verifyAndEnableTwoFA = async (secret: string, token: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      setLoading(true)
      setError(null)

      // Verify the token
      const isValid = totp.verifyToken(secret, token)
      if (!isValid) {
        throw new Error('Invalid verification code')
      }

      // Generate backup codes
      const backupCodes = totp.generateBackupCodes(10)

      // Save secret, enable 2FA, and store backup codes
      const { error: updateError } = await db.verifyAndCompleteTwoFASetup(
        user.id,
        secret,
        backupCodes
      )

      if (updateError) throw updateError

      // Update local state
      setTwoFAEnabled(true)
      setTwoFAVerified(true)
      setBackupCodesCount(backupCodes.length)

      return backupCodes
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify 2FA'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * Verify OTP token during login
   */
  const verifyTwoFAToken = (secret: string | null | undefined, token: string) => {
    if (!secret) {
      throw new Error('2FA secret not found')
    }

    return totp.verifyToken(secret, token)
  }

  /**
   * Validate and use a backup code
   */
  const validateBackupCode = (backupCodes: string[], code: string) => {
    return totp.validateBackupCode(backupCodes, code)
  }

  /**
   * Disable 2FA for the user
   */
  const disableTwoFA = async () => {
    if (!user) throw new Error('User not authenticated')

    try {
      setLoading(true)
      setError(null)

      const { error: disableError } = await db.disableTwoFA(user.id)
      if (disableError) throw disableError

      setTwoFAEnabled(false)
      setTwoFAVerified(false)
      setBackupCodesCount(0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disable 2FA'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    twoFAEnabled,
    twoFAVerified,
    backupCodesCount,
    loading,
    error,
    initiateTwoFASetup,
    verifyAndEnableTwoFA,
    verifyTwoFAToken,
    validateBackupCode,
    disableTwoFA,
  }
}
