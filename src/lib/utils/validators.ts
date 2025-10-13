// Additional validation utilities

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isValidZipCode(zip: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(zip)
}

export function isStrongPassword(password: string): boolean {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

export function sanitizeFileName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_')
}

