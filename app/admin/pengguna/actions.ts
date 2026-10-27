'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin, type Role } from '@/lib/auth'
import { tempSecret } from '@/lib/secret'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// Hak akses dicek oleh RPC (sebagai user yang login) SEBELUM operasi Auth dengan service role.

export type UserActionResult = { error?: string; secret?: string }

const roleEnum = z.enum(['staff', 'admin', 'super_admin'])
const createSchema = z.object({
  nim: z.string().trim().regex(/^\d{5,20}$/, 'NIM harus angka 5–20 digit'),
  fullName: z.string().trim().min(1, 'Nama wajib diisi').max(100),
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{2,10}$/, 'Kode harus 2–10 huruf'),
  role: roleEnum,
})

async function targetOf(userId: string) {
  const { data } = await createAdminClient().from('profiles').select('nim, role').eq('id', userId).single()
  return data!
}

export async function createAccount(input: unknown): Promise<UserActionResult> {
  await requireAdmin()
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const v = parsed.data

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
  })
  if (rpcError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return { error: rpcError.message }
  }

  revalidatePath('/admin/pengguna')
  return { secret }
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

export async function updateAccount(userId: string, fullName: string, code: string): Promise<UserActionResult> {
  await requireAdmin()
  const parsed = createSchema.pick({ fullName: true, code: true }).safeParse({ fullName, code })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_update_profile', {
    p_user: userId,
    p_full_name: parsed.data.fullName,
    p_code: parsed.data.code,
  })
  revalidatePath('/admin/pengguna')
  return error ? { error: error.message } : {}
}
