import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Pengaturan' }

async function save(formData: FormData) {
  'use server'
  await requireSuperAdmin()
  const num = (k: string) => Number(formData.get(k))
  const chat = String(formData.get('chat') ?? '').trim()
  const supabase = await createClient()
  const { error } = await supabase.rpc('update_settings', {
    p_open_hour: num('open'),
    p_close_hour: num('close'),
    p_photo_retention_days: num('retention'),
    p_admin_telegram_chat_id: chat ? Number(chat) : (null as unknown as number),
  })
  revalidatePath('/', 'layout')
  redirect(`/admin/pengaturan?${error ? 'error=' + encodeURIComponent(error.message) : 'ok=1'}`)
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireSuperAdmin()
  const { ok, error } = await searchParams
  const supabase = await createClient()
  const { data: s } = await supabase.rpc('get_settings')

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Pengaturan" title="Pengaturan" highlight="lab" />
      <form action={save} className="card-surface space-y-4 p-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="open">Jam buka</label>
            <input id="open" name="open" type="number" min={0} max={23} defaultValue={s?.open_hour ?? 8} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="close">Jam tutup</label>
            <input id="close" name="close" type="number" min={1} max={24} defaultValue={s?.close_hour ?? 21} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="retention">Simpan foto (hari)</label>
          <input id="retention" name="retention" type="number" min={1} defaultValue={s?.photo_retention_days ?? 90} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="chat">Chat ID grup Telegram admin</label>
          <input id="chat" name="chat" inputMode="numeric" defaultValue={s?.admin_telegram_chat_id ?? ''} placeholder="mis. -1001234567890" className="input font-mono" />
          <p className="mt-1.5 text-xs text-gray-400">Tambahkan bot ke grup admin, lalu kirim /chatid di grup itu untuk melihat ID-nya.</p>
        </div>
        {ok && <p className="rounded-xl bg-accent-green/10 px-4 py-2.5 text-sm text-emerald-700">Tersimpan.</p>}
        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full">Simpan</button>
      </form>
    </div>
  )
}
