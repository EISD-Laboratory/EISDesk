import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import PageHeader from '@/components/PageHeader'
import { requireUser } from '@/lib/auth'
import { ROLE_LABEL } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import TelegramLink from './TelegramLink'

export const metadata: Metadata = { title: 'Profil' }

async function toggleNotify(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.rpc('set_notify_session_open', { p_enabled: formData.get('enabled') === 'true' })
  revalidatePath('/profil')
}

export default async function ProfilePage() {
  const profile = await requireUser()
  const secret = profile.role === 'staff' ? 'PIN' : 'password'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader eyebrow="Profil" title={profile.full_name} />

      <div className="card-surface p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-gray-400">Kode</dt><dd className="font-mono font-semibold tracking-wider">{profile.code}</dd></div>
          <div><dt className="text-gray-400">NIM</dt><dd className="font-medium">{profile.nim}</dd></div>
          <div><dt className="text-gray-400">Role</dt><dd className="font-medium">{ROLE_LABEL[profile.role]}</dd></div>
        </dl>
        <Link href="/ganti-rahasia" className="btn-secondary mt-4">Ganti {secret}</Link>
      </div>

      <div className="card-surface flex items-center justify-between gap-4 p-5">
        <div>
          <p className="font-semibold text-gray-900">Notifikasi saat lab dibuka</p>
          <p className="text-sm text-gray-500">Dapat kabar setiap admin membuka sesi lab.</p>
        </div>
        <form action={toggleNotify}>
          <input type="hidden" name="enabled" value={String(!profile.notify_session_open)} />
          <button className={profile.notify_session_open ? 'btn-primary' : 'btn-secondary'}>
            {profile.notify_session_open ? 'Aktif' : 'Nonaktif'}
          </button>
        </form>
      </div>

      <TelegramLink linked={profile.telegram_chat_id !== null} />
    </div>
  )
}
