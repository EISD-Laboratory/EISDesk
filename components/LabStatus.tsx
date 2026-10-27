import Link from 'next/link'
import { DoorClosed, DoorOpen } from 'lucide-react'
import { getProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { fmtTime } from '@/lib/time'

export default async function LabStatus() {
  const supabase = await createClient()
  const profile = await getProfile()

  const { data: open } = await supabase
    .from('public_schedule')
    .select('id, title, planned_end, opened_at')
    .eq('status', 'open')
    .maybeSingle()

  let pic: string | null = null
  if (open && profile) {
    const { data } = await supabase
      .from('lab_sessions')
      .select('pic:profiles!lab_sessions_current_pic_fkey(full_name, code)')
      .eq('id', open.id!)
      .single()
    pic = data?.pic ? `${data.pic.full_name} (${data.pic.code})` : null
  }

  if (!open) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white/70 p-4 shadow-soft">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
          <DoorClosed className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Lab sedang tutup</p>
          <p className="text-sm text-gray-500">Butuh lab? Hubungi koor divisi atau inti yang bisa jadi PJ.</p>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={profile ? `/sesi/${open.id}` : '/login'}
      className="card-glow-smooth mb-6 flex items-center gap-3 rounded-2xl border border-accent-green/30 bg-accent-green/5 p-4 shadow-soft"
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-green/15 text-emerald-700">
        <DoorOpen className="h-5 w-5" strokeWidth={1.8} />
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-accent-green pulse-subtle" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-gray-900">Lab sedang buka · {open.title}</p>
        <p className="truncate text-sm text-gray-600">
          Dibuka {fmtTime(open.opened_at!)} · rencana sampai {fmtTime(open.planned_end!)}
          {pic && ` · PJ ${pic}`}
        </p>
      </div>
    </Link>
  )
}
