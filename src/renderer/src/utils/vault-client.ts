// Client-side crypto utilities using Web Crypto API — no IPC needed

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const SIMILAR = 'il1Lo0O'

export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeSimilar: boolean
}

export function generatePassword(opts: PasswordOptions): string {
  let chars = ''
  if (opts.uppercase) chars += UPPERCASE
  if (opts.lowercase) chars += LOWERCASE
  if (opts.numbers) chars += NUMBERS
  if (opts.symbols) chars += SYMBOLS
  if (opts.excludeSimilar) {
    chars = chars.split('').filter((c) => !SIMILAR.includes(c)).join('')
  }
  if (!chars) return ''

  const arr = new Uint32Array(opts.length)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => chars[n % chars.length]).join('')
}

export function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (pw.length >= 16) s++
  if (/[a-z]/.test(pw)) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++

  if (s <= 2) return { score: s, label: 'Weak', color: 'dock-red' }
  if (s <= 4) return { score: s, label: 'Fair', color: 'dock-yellow' }
  if (s <= 5) return { score: s, label: 'Good', color: 'dock-accent' }
  return { score: s, label: 'Strong', color: 'dock-green' }
}

export function decodeJWT(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const decode = (s: string) => {
      const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
      return JSON.parse(new TextDecoder().decode(bytes))
    }
    return { header: decode(parts[0]), payload: decode(parts[1]), signature: parts[2] }
  } catch {
    return null
  }
}

export async function createJWT(payload: object, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const te = new TextEncoder()
  const b64url = (data: Uint8Array) =>
    btoa(String.fromCharCode(...data)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const enc = (o: object) => b64url(te.encode(JSON.stringify(o)))
  const msg = `${enc(header)}.${enc(payload)}`

  const key = await crypto.subtle.importKey('raw', te.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, te.encode(msg))
  const sigB64 = b64url(new Uint8Array(sig))

  return `${msg}.${sigB64}`
}

export async function hashText(text: string, algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512'): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest(algorithm, data)
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateUUID(): string {
  return crypto.randomUUID()
}

export function generateUUIDs(count: number): string[] {
  return Array.from({ length: count }, () => crypto.randomUUID())
}

export function encodeBase64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)))
}

export function decodeBase64(encoded: string): string {
  return decodeURIComponent(escape(atob(encoded)))
}

export function generateHexKey(bits: 128 | 256 | 512): string {
  const arr = new Uint8Array(bits / 8)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateApiKey(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const arr = new Uint32Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => chars[n % chars.length]).join('')
}
