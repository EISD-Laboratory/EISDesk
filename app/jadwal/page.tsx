import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import LabStatus from '@/components/LabStatus'
import { getProfile, isAdmin } from '@/lib/auth'
import { CATEGORY_CHIP, CATEGORY_GRADIENT, CATEGORY_LABEL } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { addDaysStr, fmt, fmtTime, isDateStr, todayWib, toWib, weekStart, wibIso } from '@/lib/time'

export const metadata: Metadata = { title: 'Jadwal Lab' }

const HOUR_PX = 48

export default async function JadwalPage({ searchParams }: { searchParams: Promise<{ minggu?: string }> }) {
  const { minggu } = await searchParams
  const today = todayWib()
  const start = weekStart(isDateStr(minggu) ? minggu : today)
  const days = Array.from({ length: 6 }, (_, i) => addDaysStr(start, i)) // Senin–Sabtu

  const supabase = await createClient()
  const profile = await getProfile()

  const [{ data: sessions }, { data: holidays }, { data: settings }] = await Promise.all([
    supabase
      .from('public_schedule')
      .select('*')
      .gte('planned_start', wibIso(days[0], 0))
      .lt('planned_start', wibIso(addDaysStr(start, 7), 0))
      .order('planned_start'),
    supabase.from('holidays').select('date, name').gte('date', days[0]).lte('date', days[5]),
    supabase.from('settings').select('open_hour, close_hour').single(),
  ])

  const openHour = settings?.open_hour ?? 8
  const closeHour = settings?.close_hour ?? 21
  const hours = Array.from({ length: closeHour - openHour }, (_, i) => openHour + i)
  const holidayByDate = new Map((holidays ?? []).map((h) => [h.date, h.name]))
  const byDay = new Map(days.map((d) => [d, (sessions ?? []).filter((s) => fmt(s.planned_start!, 'yyyy-MM-dd') === d)]))

  const linkFor = (id: string) => (profile ? `/sesi/${id}` : '/login')

  return (
    <div>
      <PageHeader
        eyebrow="Jadwal Lab"
        title="Siapa pakai"
        highlight="lab hari ini?"
        subtitle="Jadwal sesi Lab EISD. Lab buka Senin–Sabtu, tutup hari Minggu & tanggal merah."
        action={
          profile && isAdmin(profile.role) ? (
            <Link href="/admin/sesi/baru" className="btn-primary self-start">
              <Plus className="h-4 w-4" strokeWidth={1.8} /> Buat sesi
            </Link>
          ) : undefined
        }
      />

      <LabStatus />

      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/jadwal?minggu=${addDaysStr(start, -7)}`} className="btn-secondary px-3" aria-label="Minggu sebelumnya">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">
            {fmt(wibIso(days[0], 12), 'd MMM')} – {fmt(wibIso(days[5], 12), 'd MMM yyyy')}
          </p>
          {start !== weekStart(today) && (
            <Link href="/jadwal" className="text-xs font-medium text-primary hover:underline">Kembali ke minggu ini</Link>
          )}
        </div>
        <Link href={`/jadwal?minggu=${addDaysStr(start, 7)}`} className="btn-secondary px-3" aria-label="Minggu berikutnya">
          <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
        </Link>
      </div>

      {/* Desktop: grid minggu */}
      <div className="card-surface hidden overflow-hidden md:block">
        <div className="grid grid-cols-[56px_repeat(6,1fr)] border-b border-gray-100">
          <div />
          {days.map((d) => (
            <div key={d} className={`px-2 py-3 text-center ${d === today ? 'bg-primary/5' : ''}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{fmt(wibIso(d, 12), 'EEE')}</p>
              <p className={`text-lg font-bold ${d === today ? 'text-primary' : 'text-gray-900'}`}>{fmt(wibIso(d, 12), 'd')}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[56px_repeat(6,1fr)]">
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_PX }} className="pr-2 pt-1 text-right text-[11px] text-gray-400">
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>
          {days.map((d) => {
            const holiday = holidayByDate.get(d)
            return (
              <div key={d} className={`relative border-l border-gray-100 ${d === today ? 'bg-primary/[0.03]' : ''}`} style={{ height: hours.length * HOUR_PX }}>
                {hours.map((h) => (
                  <div key={h} style={{ top: (h - openHour) * HOUR_PX }} className="absolute inset-x-0 border-t border-dashed border-gray-100" />
                ))}
                {holiday && (
                  <div className="absolute inset-1 flex items-center justify-center rounded-xl bg-red-50/80 p-2 text-center text-xs font-medium text-red-500">
                    Tutup · {holiday}
                  </div>
                )}
                {byDay.get(d)!.map((s) => {
                  const startH = toWib(s.planned_start!).getHours()
                  const endH = toWib(s.planned_end!).getHours()
                  return (
                    <Link
                      key={s.id}
                      href={linkFor(s.id!)}
                      style={{ top: (startH - openHour) * HOUR_PX + 2, height: (endH - startH) * HOUR_PX - 4 }}
                      className={`card-glow-smooth absolute inset-x-1 overflow-hidden rounded-xl border bg-white text-left shadow-soft ${s.status === 'closed' ? 'opacity-60' : ''}`}
                    >
                      <div className={`h-1 bg-gradient-to-r ${CATEGORY_GRADIENT[s.category!]}`} />
                      <div className="p-1.5">
                        <p className="truncate text-xs font-semibold text-gray-900">
                          {s.status === 'open' && <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-accent-green pulse-subtle" />}
                          {s.title}
                        </p>
                        <p className="text-[11px] text-gray-500">{fmtTime(s.planned_start!)}–{fmtTime(s.planned_end!)}</p>
                        {s.participant_count! > 0 && <p className="text-[11px] text-gray-400">{s.participant_count} orang</p>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: daftar per hari */}
      <div className="space-y-4 md:hidden">
        {days.map((d) => {
          const holiday = holidayByDate.get(d)
          const list = byDay.get(d)!
          return (
            <section key={d}>
              <h2 className={`mb-2 text-sm font-semibold ${d === today ? 'text-primary' : 'text-gray-700'}`}>
                {fmt(wibIso(d, 12), 'EEEE, d MMM')} {d === today && '· Hari ini'}
              </h2>
              {holiday ? (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">Lab tutup · {holiday}</p>
              ) : list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-400">Belum ada sesi</p>
              ) : (
                <div className="space-y-2">
                  {list.map((s) => (
                    <Link key={s.id} href={linkFor(s.id!)} className="card-surface block overflow-hidden">
                      <div className={`h-1 bg-gradient-to-r ${CATEGORY_GRADIENT[s.category!]}`} />
                      <div className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-900">{s.title}</p>
                          <p className="text-sm text-gray-500">
                            {fmtTime(s.planned_start!)}–{fmtTime(s.planned_end!)} · {s.participant_count} orang
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.status === 'open' ? 'border-accent-green/30 bg-accent-green/15 text-emerald-700' : CATEGORY_CHIP[s.category!]}`}>
                          {s.status === 'open' ? 'Terbuka' : s.status === 'closed' ? 'Selesai' : CATEGORY_LABEL[s.category!]}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {!profile && (
        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/login" className="font-semibold text-primary hover:underline">Masuk</Link> untuk melihat detail & ikut sesi.
        </p>
      )}
    </div>
  )
}
