import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

/**
 * Generate a TOTP secret and QR code for authenticator app setup
 * @param email User email address (shown on authenticator app as account identifier)
 * @param issuer App name (shown on authenticator app)
 * @returns Object containing secret, QR code data URL, and manual entry string
 */
export async function generateSecret(email: string, issuer = 'FinArt') {
  const secret = speakeasy.generateSecret({
    name: `${issuer} (${email})`,
    issuer: issuer,
    length: 32,
  })

  // Generate QR code as data URL
  const qrCode = await QRCode.toDataURL(secret.otpauth_url || '')

  return {
    secret: secret.base32,
    qrCode,
    manualEntry: secret.base32,
  }
}

/**
 * Verify a TOTP token (6-digit code from authenticator app)
 * @param secret Base32 encoded secret
 * @param token 6-digit code to verify
 * @param window Time window in 30-second intervals (±1 by default)
 * @returns true if valid, false otherwise
 */
export function verifyToken(secret: string, token: string, window = 1): boolean {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window,
    })
    return verified
  } catch (error) {
    return false
  }
}

/**
 * Generate array of backup codes for account recovery
 * Each backup code is 8 characters (format: XXXX-XXXX for display)
 * @param count Number of backup codes to generate (default: 10)
 * @returns Array of backup codes without hyphens
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = Array.from(
      { length: 8 },
      () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
    ).join('')
    codes.push(code)
  }
  return codes
}

/**
 * Validate a backup code
 * @param codes Array of backup codes (with or without hyphens)
 * @param code Backup code to validate (with or without hyphens)
 * @returns Object with validity, remaining count, and updated codes array
 */
export function validateBackupCode(
  codes: string[],
  code: string
): { valid: boolean; remaining: number; updatedCodes?: string[] } {
  // Normalize by removing hyphens
  const cleanCode = code.replace(/-/g, '').toUpperCase()
  const cleanCodes = codes.map(c => c.replace(/-/g, '').toUpperCase())

  const index = cleanCodes.indexOf(cleanCode)

  if (index === -1) {
    return {
      valid: false,
      remaining: cleanCodes.length,
    }
  }

  // Remove the used code
  const updatedCodes = cleanCodes.filter((_, i) => i !== index)

  return {
    valid: true,
    remaining: updatedCodes.length,
    updatedCodes,
  }
}

/**
 * Format backup codes for display (XXXX-XXXX format)
 * @param codes Array of 8-character backup codes
 * @returns Formatted string with codes separated by newlines
 */
export function formatBackupCodesForDisplay(codes: string[]): string {
  return codes
    .map(code => `${code.substring(0, 4)}-${code.substring(4)}`)
    .join('\n')
}

/**
 * Check if a string is a valid 6-digit TOTP token
 * @param token String to validate
 * @returns true if valid 6-digit code
 */
export function isValidTotpFormat(token: string): boolean {
  return /^\d{6}$/.test(token)
}
