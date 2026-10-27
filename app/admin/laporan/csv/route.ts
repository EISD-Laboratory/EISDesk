import { getProfile, isAdmin } from '@/lib/auth'
import { CATEGORY_LABEL, STATUS_LABEL } from '@/lib/labels'
import { hoursUsed, loadMonth } from '@/lib/report'
import { fmt, todayWib } from '@/lib/time'

const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

export async function GET(request: Request) {
  const profile = await getProfile()
  if (!profile || !isAdmin(profile.role)) return new Response('forbidden', { status: 403 })

  const bulan = new URL(request.url).searchParams.get('bulan') ?? ''
  const month = /^\d{4}-\d{2}$/.test(bulan) ? bulan : todayWib().slice(0, 7)
  const sessions = await loadMonth(month)

  const rows = [
    ['Tanggal', 'Judul', 'Kategori', 'Status', 'Rencana mulai', 'Rencana selesai', 'Dibuka', 'Ditutup', 'Jam terpakai', 'Dibuka oleh', 'Ditutup oleh', 'Hadir', 'Rencana hadir'],
    ...sessions.map((s) => [
      fmt(s.planned_start, 'yyyy-MM-dd'),
      s.title,
      CATEGORY_LABEL[s.category],
      STATUS_LABEL[s.status],
      fmt(s.planned_start, 'HH:mm'),
      fmt(s.planned_end, 'HH:mm'),
      s.opened_at ? fmt(s.opened_at, 'HH:mm') : '',
      s.closed_at ? fmt(s.closed_at, 'HH:mm') : '',
      hoursUsed(s).toFixed(2),
      s.opener ? `${s.opener.full_name} (${s.opener.code})` : '',
      s.closer ? `${s.closer.full_name} (${s.closer.code})` : '',
      s.session_participants.filter((p) => p.attended_at).map((p) => p.profile?.code).join(' '),
      s.session_participants.filter((p) => !p.attended_at).map((p) => p.profile?.code).join(' '),
    ]),
  ]

  // BOM supaya Excel membaca UTF-8 dengan benar
  const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="eisdesk-${month}.csv"`,
    },
  })
}
