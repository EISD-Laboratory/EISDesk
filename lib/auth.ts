import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Role = Database['public']['Enums']['user_role']

export const isAdmin = (role: Role) => role === 'admin' || role === 'super_admin'

// Profil user yang sedang login (null kalau belum login / nonaktif). Di-cache per request.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims) return null

  const { data } = await supabase.rpc('get_my_profile')
  if (!data?.id || !data.is_active) return null
  return data
})

export async function requireUser(opts: { allowMustChange?: boolean } = {}) {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.must_change_secret && !opts.allowMustChange) redirect('/ganti-rahasia')
  return profile
}

export async function requireAdmin() {
  const profile = await requireUser()
  if (!isAdmin(profile.role)) redirect('/jadwal')
  return profile
}

export async function requireSuperAdmin() {
  const profile = await requireUser()
  if (profile.role !== 'super_admin') redirect('/admin')
  return profile
}
