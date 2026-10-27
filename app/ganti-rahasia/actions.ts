'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { secretLabel, secretProblem } from '@/lib/secret'
import { createClient } from '@/lib/supabase/server'

export type ChangeState = { error?: string } | undefined

export async function changeSecret(_: ChangeState, formData: FormData): Promise<ChangeState> {
  const profile = await requireUser({ allowMustChange: true })
  const secret = String(formData.get('secret') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  const problem = secretProblem(profile.role, secret, profile.nim)
  if (problem) return { error: problem }
  if (secret !== confirm) return { error: `Konfirmasi ${secretLabel(profile.role)} tidak sama` }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: secret })
  if (error) {
    return { error: error.code === 'same_password' ? `${secretLabel(profile.role)} baru harus berbeda dari yang lama` : error.message }
  }

  await supabase.rpc('mark_secret_changed')
  redirect('/jadwal')
}
