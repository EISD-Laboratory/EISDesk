import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { addDaysStr, nowHourWib, todayWib } from '@/lib/time'
import NewSessionForm from './NewSessionForm'

export const metadata: Metadata = { title: 'Buat Sesi' }

export default async function NewSessionPage() {
  const profile = await requireAdmin()
  const supabase = await createClient()
  const today = todayWib()

  const [{ data: holidays }, { data: settings }] = await Promise.all([
    supabase.from('holidays').select('date, name').gte('date', today).lte('date', addDaysStr(today, 120)),
    supabase.from('settings').select('open_hour, close_hour').single(),
  ])

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Sesi Lab" title="Buat" highlight="sesi baru" subtitle="Jadwalkan sesi, atau langsung buka lab sekarang kalau kunci sudah kamu ambil." />
      <NewSessionForm
        userId={profile.id}
        today={today}
        nowHour={nowHourWib()}
        openHour={settings?.open_hour ?? 8}
        closeHour={settings?.close_hour ?? 21}
        holidays={Object.fromEntries((holidays ?? []).map((h) => [h.date, h.name]))}
      />
    </div>
  )
}
