'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, type Role } from '@/lib/auth'
import { DIVISIONS } from '@/lib/labels'
import { tempSecret } from '@/lib/secret'
import { IMPORT_MAX_ROWS, type ImportResult, type ImportRow } from '@/lib/staffImport'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Hak akses dicek oleh RPC (sebagai user yang login) SEBELUM operasi Auth dengan service role.

export type UserActionResult = { error?: string; secret?: string }

const roleEnum = z.enum(['staff', 'admin', 'super_admin'])
// "research&community", "STUDY GROUP" -> cocok dengan nama resmi
const divisionKey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const profileFields = {
  nim: z.string().trim().regex(/^\d{5,20}$/, 'NIM harus angka 5–20 digit'),
  fullName: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{2,10}$/, 'Kode harus 2–10 huruf'),
  angkatan: z.union([z.literal(''), z.coerce.number().int('Angkatan harus tahun, mis. 2023').min(2000, 'Angkatan harus tahun, mis. 2023').max(2100, 'Angkatan harus tahun, mis. 2023')])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  divisi: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v?.trim()) return null
      const found = DIVISIONS.find((d) => divisionKey(d) === divisionKey(v))
      if (!found) ctx.addIssue({ code: 'custom', message: `Divisi "${v.trim()}" tidak dikenal. Pilihan: ${DIVISIONS.join(', ')}` })
      return found ?? null
    }),
}
const createSchema = z.object({ ...profileFields, role: roleEnum })
type NewAccount = z.output<typeof createSchema>

async function targetOf(userId: string) {
  const { data } = await createAdminClient().from('profiles').select('nim, role').eq('id', userId).single()
  return data!
}

// Buat user Auth (email acak) + profil. Hak akses dicek RPC; kalau gagal, user Auth dihapus lagi.
async function createOne(v: NewAccount): Promise<UserActionResult> {
  const admin = createAdminClient()
  const secret = tempSecret(v.role, v.nim)
  const { data: created, error } = await admin.auth.admin.createUser({
    email: `${v.nim}-${randomBytes(8).toString('hex')}@eisdesk.local`,
    password: secret,
    email_confirm: true,
  })
  if (error || !created.user) return { error: error?.message ?? 'Gagal membuat akun' }

  const supabase = await createClient()
  const { error: rpcError } = await supabase.rpc('admin_create_profile', {
    p_id: created.user.id,
    p_nim: v.nim,
    p_auth_email: created.user.email!,
    p_full_name: v.fullName,
    p_code: v.code,
    p_role: v.role,
    p_angkatan: v.angkatan ?? undefined,
    p_divisi: v.divisi ?? undefined,
  })
  if (rpcError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return { error: rpcError.message }
  }
  return { secret }
}

export async function createAccount(input: unknown): Promise<UserActionResult> {
  await requireAdmin()
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const res = await createOne(parsed.data)
  revalidatePath('/admin/pengguna')
  return res
}

// ---------------------------------------------------------------------------
// Import staff dari Excel. File dibaca di browser, baris dikirim ke sini dan divalidasi ulang.
// Semua baris dicek dulu; kalau ada yang salah tidak ada akun yang dibuat (perbaiki file, upload lagi).

export async function importStaff(rows: ImportRow[]): Promise<ImportResult> {
  await requireAdmin()
  if (!Array.isArray(rows) || rows.length === 0) return { errors: [{ row: 0, message: 'File tidak berisi data' }] }
  if (rows.length > IMPORT_MAX_ROWS) return { errors: [{ row: 0, message: `Maksimal ${IMPORT_MAX_ROWS} baris per import` }] }

  const errors: { row: number; message: string }[] = []
  const valid: (NewAccount & { row: number })[] = []
  const seenNim = new Map<string, number>()
  const seenCode = new Map<string, number>()

  for (const r of rows) {
    // Duplikat dicek dari nilai mentah, supaya semua kesalahan ketahuan dalam sekali upload
    const nim = String(r.nim ?? '').trim()
    const code = String(r.code ?? '').trim().toUpperCase()
    const dupNim = nim && seenNim.get(nim)
    const dupCode = code && seenCode.get(code)
    if (nim && !dupNim) seenNim.set(nim, r.row)
    if (code && !dupCode) seenCode.set(code, r.row)

    const parsed = createSchema.safeParse({ ...r, role: 'staff' })
    if (!parsed.success) errors.push({ row: r.row, message: parsed.error.issues[0].message })
    else if (dupNim) errors.push({ row: r.row, message: `NIM ${nim} sama dengan baris ${dupNim}` })
    else if (dupCode) errors.push({ row: r.row, message: `Kode ${code} sama dengan baris ${dupCode}` })
    else valid.push({ ...parsed.data, row: r.row })
  }

  // Bentrok dengan akun yang sudah ada
  if (valid.length) {
    const admin = createAdminClient()
    const [{ data: byNim }, { data: byCode }] = await Promise.all([
      admin.from('profiles').select('nim').in('nim', valid.map((v) => v.nim)),
      admin.from('profiles').select('code').in('code', valid.map((v) => v.code)),
    ])
    const takenNim = new Set((byNim ?? []).map((p) => p.nim))
    const takenCode = new Set((byCode ?? []).map((p) => p.code))
    for (const v of valid) {
      if (takenNim.has(v.nim)) errors.push({ row: v.row, message: `NIM ${v.nim} sudah punya akun` })
      else if (takenCode.has(v.code)) errors.push({ row: v.row, message: `Kode ${v.code} sudah dipakai akun lain` })
    }
  }

  if (errors.length) return { errors: errors.sort((a, b) => a.row - b.row) }

  // Buat akun, 5 sekaligus
  const created: NonNullable<ImportResult['created']> = []
  const failed: NonNullable<ImportResult['failed']> = []
  for (let i = 0; i < valid.length; i += 5) {
    const batch = valid.slice(i, i + 5)
    const results = await Promise.all(batch.map(createOne))
    results.forEach((res, j) => {
      const v = batch[j]
      if (res.secret) created.push({ row: v.row, fullName: v.fullName, nim: v.nim, code: v.code, pin: res.secret })
      else failed.push({ row: v.row, fullName: v.fullName, message: res.error ?? 'Gagal membuat akun' })
    })
  }

  revalidatePath('/admin/pengguna')
  return { created, failed }
}

export async function resetSecret(userId: string): Promise<UserActionResult> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_require_secret_change', { p_user: userId })
  if (error) return { error: error.message }

  const t = await targetOf(userId)
  const secret = tempSecret(t.role, t.nim)
  const { error: authError } = await createAdminClient().auth.admin.updateUserById(userId, { password: secret })
  if (authError) return { error: authError.message }
  return { secret }
}

export async function setActive(userId: string, active: boolean): Promise<UserActionResult> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_set_active', { p_user: userId, p_active: active })
  if (error) return { error: error.message }

  // Ban di Auth supaya sesi login yang masih ada ikut mati
  const { error: authError } = await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: active ? 'none' : '876000h',
  })
  revalidatePath('/admin/pengguna')
  return authError ? { error: authError.message } : {}
}

export async function setRole(userId: string, role: Role): Promise<UserActionResult> {
  await requireAdmin()
  if (!roleEnum.safeParse(role).success) return { error: 'Role tidak valid' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_set_role', { p_user: userId, p_role: role })
  if (error) return { error: error.message }

  // Staff pakai PIN, admin pakai password -> ganti role = rahasia sementara baru
  const t = await targetOf(userId)
  const secret = tempSecret(role, t.nim)
  const { error: authError } = await createAdminClient().auth.admin.updateUserById(userId, { password: secret })
  revalidatePath('/admin/pengguna')
  return authError ? { error: authError.message } : { secret }
}

export async function updateAccount(
  userId: string,
  input: { fullName: string; code: string; angkatan: string; divisi: string },
): Promise<UserActionResult> {
  await requireAdmin()
  const parsed = createSchema.pick({ fullName: true, code: true, angkatan: true, divisi: true }).safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_update_profile', {
    p_user: userId,
    p_full_name: parsed.data.fullName,
    p_code: parsed.data.code,
    p_angkatan: parsed.data.angkatan ?? undefined,
    p_divisi: parsed.data.divisi ?? undefined,
  })
  revalidatePath('/admin/pengguna')
  return error ? { error: error.message } : {}
}
