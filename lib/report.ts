import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { wibIso } from '@/lib/time'

// Data laporan satu bulan (yyyy-MM) untuk halaman laporan & export CSV
export async function loadMonth(month: string) {
  const first = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const supabase = await createClient()
  const { data: sessions } = await supabase
    .from('lab_sessions')
    .select(
      `id, title, category, status, planned_start, planned_end, opened_at, closed_at,
      opener:profiles!lab_sessions_opened_by_fkey(full_name, code),
      closer:profiles!lab_sessions_closed_by_fkey(full_name, code),
      session_participants(attended_at, profile:profiles(id, full_name, code))`,
    )
    .in('status', ['open', 'closed'])
    .gte('planned_start', wibIso(first, 0))
    .lt('planned_start', wibIso(next, 0))
    .order('planned_start')

  return sessions ?? []
}

export const hoursUsed = (s: { opened_at: string | null; closed_at: string | null }) =>
  s.opened_at && s.closed_at ? (new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 3_600_000 : 0
