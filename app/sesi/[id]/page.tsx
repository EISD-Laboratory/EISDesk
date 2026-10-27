import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CalendarClock, KeyRound, Users } from 'lucide-react'
import { isAdmin, requireUser } from '@/lib/auth'
import { CATEGORY_CHIP, CATEGORY_GRADIENT, CATEGORY_LABEL, STATUS_CHIP, STATUS_LABEL } from '@/lib/labels'
import { createClient } from '@/lib/supabase/server'
import { fmt, fmtDate, fmtTime, todayWib, toWib } from '@/lib/time'
import SessionActions from './SessionActions'

export const metadata: Metadata = { title: 'Detail Sesi' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const person = (p: { full_name: string; code: string } | null) => (p ? `${p.full_name} (${p.code})` : '-')

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()

  const profile = await requireUser()
  const admin = isAdmin(profile.role)
  const supabase = await createClient()

  const [{ data: s }, { data: participants }, { data: logs }, { data: settings }] = await Promise.all([
    supabase
      .from('lab_sessions')
      .select(
        `*,
        creator:profiles!lab_sessions_created_by_fkey(full_name, code),
        pic:profiles!lab_sessions_current_pic_fkey(full_name, code),
        opener:profiles!lab_sessions_opened_by_fkey(full_name, code),
        closer:profiles!lab_sessions_closed_by_fkey(full_name, code)`,
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('session_participants')
      .select('user_id, purpose, joined_at, attended_at, profile:profiles(full_name, code)')
      .eq('session_id', id)
      .order('joined_at'),
    supabase
      .from('session_pic_logs')
      .select('type, created_at, from:profiles!session_pic_logs_from_admin_fkey(full_name, code), to:profiles!session_pic_logs_to_admin_fkey(full_name, code)')
      .eq('session_id', id)
      .order('created_at'),
    supabase.from('settings').select('close_hour').single(),
  ])
  if (!s) notFound()

  const { data: admins } = admin
    ? await supabase.from('profiles').select('id, full_name, code').in('role', ['admin', 'super_admin']).eq('is_active', true).order('full_name')
    : { data: [] }

  // Foto hanya untuk admin (bucket private, RLS storage)
  const photoPaths = [s.open_photo_path, s.close_room_photo_path, s.close_key_photo_path]
  let photos: (string | null)[] = []
  if (admin && photoPaths.some(Boolean) && !s.photos_deleted_at) {
    const { data } = await supabase.storage.from('session-photos').createSignedUrls(photoPaths.filter(Boolean) as string[], 600)
    const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]))
    photos = photoPaths.map((p) => (p ? byPath.get(p) ?? null : null))
  }

  const me = participants?.find((p) => p.user_id === profile.id)
  const groups = new Map<string, NonNullable<typeof participants>>()
  for (const p of participants ?? []) {
    const key = p.purpose || s.title
    groups.set(key, [...(groups.get(key) ?? []), p])
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card-surface mb-6 overflow-hidden">
        <div className={`h-1.5 bg-gradient-to-r ${CATEGORY_GRADIENT[s.category]}`} />
        <div className="p-6">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-0.5 text-xs font-medium ${STATUS_CHIP[s.status]}`}>{STATUS_LABEL[s.status]}</span>
            <span className={`rounded-full border px-3 py-0.5 text-xs font-medium ${CATEGORY_CHIP[s.category]}`}>{CATEGORY_LABEL[s.category]}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">{s.title}</h1>
          {s.description && <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.description}</p>}

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <div className="icon-chip"><CalendarClock className="h-5 w-5" strokeWidth={1.8} /></div>
              <div>
                <dt className="text-xs text-gray-400">Waktu</dt>
                <dd className="text-sm font-medium text-gray-900">{fmtDate(s.planned_start)}</dd>
                <dd className="text-sm text-gray-600">{fmtTime(s.planned_start)}–{fmtTime(s.planned_end)} WIB</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="icon-chip"><KeyRound className="h-5 w-5" strokeWidth={1.8} /></div>
              <div>
                <dt className="text-xs text-gray-400">PJ saat ini</dt>
                <dd className="text-sm font-medium text-gray-900">{person(s.pic)}</dd>
                {s.opened_at && <dd className="text-sm text-gray-600">Dibuka {fmtTime(s.opened_at)} oleh {person(s.opener)}</dd>}
                {s.closed_at && <dd className="text-sm text-gray-600">Ditutup {fmtTime(s.closed_at)} oleh {person(s.closer)}</dd>}
              </div>
            </div>
          </dl>

          {s.status === 'cancelled' && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">Dibatalkan: {s.cancel_reason}</p>}
          {s.close_note && <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Catatan penutupan: {s.close_note}</p>}
        </div>
      </div>

      <div className={`grid gap-6 ${s.status === 'scheduled' || s.status === 'open' ? 'md:grid-cols-[1fr_320px]' : ''}`}>
        <div className="space-y-6">
          <section className="card-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-gray-900">
              <Users className="h-5 w-5 text-primary" strokeWidth={1.8} /> Peserta ({participants?.length ?? 0})
            </h2>
            {groups.size === 0 && <p className="text-sm text-gray-400">Belum ada yang ikut.</p>}
            <div className="space-y-4">
              {[...groups].map(([purpose, list]) => (
                <div key={purpose}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{purpose} · {list.length}</p>
                  <ul className="divide-y divide-gray-100">
                    {list.map((p) => (
                      <li key={p.user_id} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-gray-900">
                          {p.profile?.full_name} <span className="font-mono text-[11px] tracking-wider text-gray-400">{p.profile?.code}</span>
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${p.attended_at ? 'bg-accent-green/15 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.attended_at ? `Hadir ${fmtTime(p.attended_at)}` : 'Rencana hadir'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {(logs?.length ?? 0) > 0 && (
            <section className="card-surface p-5">
              <h2 className="mb-3 font-bold text-gray-900">Riwayat PJ</h2>
              <ul className="space-y-2 text-sm text-gray-600">
                {logs!.map((l, i) => (
                  <li key={i}>
                    <span className="text-gray-400">{fmt(l.created_at, 'HH:mm')}</span> · {person(l.from)} → {person(l.to)}{' '}
                    <span className="text-gray-400">({l.type === 'transfer' ? 'dialihkan' : l.type === 'take_over' ? 'diambil alih' : 'penggabungan sesi'})</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {admin && photos.some(Boolean) && (
            <section className="card-surface p-5">
              <h2 className="mb-3 font-bold text-gray-900">Foto</h2>
              <div className="grid grid-cols-3 gap-3">
                {['Saat dibuka', 'Saat ditutup', 'Kunci di brankas'].map((label, i) =>
                  photos[i] ? (
                    <a key={label} href={photos[i]!} target="_blank" rel="noopener noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photos[i]!} alt={label} className="aspect-square w-full rounded-xl object-cover" />
                      <p className="mt-1 text-center text-xs text-gray-500">{label}</p>
                    </a>
                  ) : null,
                )}
              </div>
            </section>
          )}
          {admin && s.photos_deleted_at && <p className="text-xs text-gray-400">Foto sudah dihapus otomatis (lebih dari 90 hari).</p>}
        </div>

        <SessionActions
          sessionId={s.id}
          status={s.status}
          userId={profile.id}
          isAdmin={admin}
          isPic={s.current_pic === profile.id}
          isToday={fmt(s.planned_start, 'yyyy-MM-dd') === todayWib()}
          joined={!!me}
          attended={!!me?.attended_at}
          date={fmt(s.planned_start, 'yyyy-MM-dd')}
          endHour={toWib(s.planned_end).getHours()}
          closeHour={settings?.close_hour ?? 21}
          admins={(admins ?? []).map((a) => ({ id: a.id, label: `${a.full_name} (${a.code})` }))}
        />
      </div>
    </div>
  )
}
