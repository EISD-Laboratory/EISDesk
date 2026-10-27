'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { fmtTime } from '@/lib/time'

export type LoginState = { error?: string } | undefined

const schema = z.object({
  nim: z.string().trim().regex(/^\d{5,20}$/, 'NIM tidak valid'),
  secret: z.string().min(1, 'Isi PIN atau password').max(72),
})

// Satu-satunya jalan login: email Auth acak hanya diketahui server, jadi lockout tidak bisa dilewati.
export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { nim, secret } = parsed.data

  const admin = createAdminClient()
  const { data: lockedUntil } = await admin.rpc('login_locked_until', { p_nim: nim })
  if (lockedUntil) return { error: `Terlalu banyak percobaan. Coba lagi pukul ${fmtTime(lockedUntil)} WIB.` }

  const { data: profile } = await admin
    .from('profiles')
    .select('auth_email, is_active, must_change_secret')
    .eq('nim', nim)
    .maybeSingle()

  let ok = false
  if (profile?.is_active) {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: profile.auth_email, password: secret })
    ok = !error
  }

  const { data: locked } = await admin.rpc('record_login_attempt', { p_nim: nim, p_success: ok })
  if (!ok) {
    return {
      error: locked
        ? `Salah 5 kali. Login NIM ini dikunci sampai pukul ${fmtTime(locked)} WIB.`
        : 'NIM atau PIN/password salah',
    }
  }

  redirect(profile!.must_change_secret ? '/ganti-rahasia' : '/jadwal')
}
