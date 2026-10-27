import { randomInt } from 'node:crypto'
import type { Role } from '@/lib/auth'

// Staff: PIN 6 digit. Admin/super admin: password minimal 8 karakter. Lihat docs/PLANNING.md bagian 3.

export function pinProblem(pin: string, nim: string): string | null {
  if (!/^\d{6}$/.test(pin)) return 'PIN harus 6 digit angka'
  if (/^(\d)\1{5}$/.test(pin)) return 'PIN tidak boleh angka yang sama semua'
  if ('01234567890'.includes(pin) || '09876543210'.includes(pin)) return 'PIN tidak boleh angka berurutan'
  if (nim.endsWith(pin)) return 'PIN tidak boleh sama dengan akhir NIM'
  return null
}

export function passwordProblem(pw: string, nim: string): string | null {
  if (pw.length < 8) return 'Password minimal 8 karakter'
  if (pw.length > 72) return 'Password maksimal 72 karakter'
  if (pw.includes(nim)) return 'Password tidak boleh mengandung NIM'
  return null
}

export const secretProblem = (role: Role, secret: string, nim: string) =>
  role === 'staff' ? pinProblem(secret, nim) : passwordProblem(secret, nim)

// Rahasia sementara dari admin; user wajib menggantinya saat login pertama
export function tempSecret(role: Role, nim: string): string {
  if (role === 'staff') {
    for (;;) {
      const pin = String(randomInt(0, 1_000_000)).padStart(6, '0')
      if (!pinProblem(pin, nim)) return pin
    }
  }
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join('')
}

export const secretLabel = (role: Role) => (role === 'staff' ? 'PIN' : 'password')
