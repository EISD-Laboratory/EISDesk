import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import LabStatus from '@/components/LabStatus'
import PageHeader from '@/components/PageHeader'
import { requireAdmin } from '@/lib/auth'
import { CATEGORY_GRADIENT, STATUS_CHIP, STATUS_LABEL } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { addDaysStr, fmtRange, todayWib, wibIso } from '@/lib/time'

export const metadata: Metadata = { title: 'Admin' }

export default async function AdminPage() {
  const profile = await requireAdmin()
  const supabase = await createClient()
  const today = todayWib()

  const { data: upcoming } = await supabase
    .from('lab_sessions')
    .select('id, title, category, status, planned_start, planned_end, current_pic, pic:profiles!lab_sessions_current_pic_fkey(full_name, code)')
    .in('status', ['scheduled', 'open'])
    .gte('planned_start', wibIso(today, 0))
    .lt('planned_start', wibIso(addDaysStr(today, 14), 0))
    .order('planned_start')

  const mine = (upcoming ?? []).filter((s) => s.current_pic === profile.id)

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Halo,"
        highlight={profile.full_name.split(' ')[0]}
        subtitle={mine.length > 0 ? `Kamu PJ untuk ${mine.length} sesi aktif/terjadwal.` : 'Kamu sedang tidak menjadi PJ sesi mana pun.'}
        action={
          <Link href="/admin/sesi/baru" className="btn-primary self-start">
            <Plus className="h-4 w-4" strokeWidth={1.8} /> Buat / buka sesi
          </Link>
        }
      />

      <LabStatus />

      <h2 className="mb-3 font-bold text-gray-900">Sesi 2 minggu ke depan</h2>
      {(upcoming?.length ?? 0) === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">Belum ada sesi terjadwal.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {upcoming!.map((s) => (
            <Link key={s.id} href={`/sesi/${s.id}`} className="card-surface card-glow-smooth block overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${CATEGORY_GRADIENT[s.category]}`} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-900">{s.title}</p>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CHIP[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{fmtRange(s.planned_start, s.planned_end)}</p>
                <p className="mt-1 text-sm text-gray-500">
                  PJ {s.pic?.full_name} {s.current_pic === profile.id && <span className="font-medium text-primary">(kamu)</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
