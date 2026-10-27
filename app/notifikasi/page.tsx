import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import {
  AlarmClock, Bell, CalendarClock, CalendarPlus, CalendarX, DoorClosed, DoorOpen, KeyRound, Merge, ShieldAlert, TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { fmt } from '@/lib/time'

export const metadata: Metadata = { title: 'Notifikasi' }

// Ikon & warna per tipe notifikasi (lihat private.notify di migrasi)
const TYPE_ICON: Record<string, [LucideIcon, string]> = {
  session_created: [CalendarPlus, 'bg-primary/10 text-primary'],
  session_opened: [DoorOpen, 'bg-accent-green/15 text-emerald-700'],
  session_closed: [DoorClosed, 'bg-gray-100 text-gray-600'],
  session_extended: [CalendarClock, 'bg-primary/10 text-primary'],
  session_merged: [Merge, 'bg-primary/10 text-primary'],
  session_cancelled: [CalendarX, 'bg-red-50 text-red-600'],
  session_overdue: [AlarmClock, 'bg-amber-50 text-amber-600'],
  lab_still_open: [TriangleAlert, 'bg-red-50 text-red-600'],
  login_locked: [ShieldAlert, 'bg-red-50 text-red-600'],
  pic_assigned: [KeyRound, 'bg-amber-50 text-amber-600'],
  pic_changed: [KeyRound, 'bg-amber-50 text-amber-600'],
  pic_taken: [KeyRound, 'bg-amber-50 text-amber-600'],
}

async function markAllRead() {
  'use server'
  const supabase = await createClient()
  await supabase.rpc('mark_notifications_read', {})
  revalidatePath('/', 'layout')
}

export default async function NotificationsPage() {
  await requireUser()
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('notifications')
    .select('id, user_id, session_id, type, message, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const unread = (items ?? []).some((n) => !n.read_at)

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Notifikasi"
        title="Kabar"
        highlight="terbaru"
        action={
          unread ? (
            <form action={markAllRead}>
              <button className="btn-secondary">Tandai semua dibaca</button>
            </form>
          ) : undefined
        }
      />
      <div className="card-surface divide-y divide-gray-100">
        {(items ?? []).map((n) => {
          const [Icon, tone] = TYPE_ICON[n.type] ?? [Bell, 'bg-gray-100 text-gray-600']
          const body = (
            <div className="flex items-start gap-3 p-4">
              <span className={`mt-3 h-2 w-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-accent-green'}`} />
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {fmt(n.created_at, 'd MMM, HH:mm')}
                  {n.user_id === null && ' · grup admin'}
                </p>
              </div>
            </div>
          )
          return n.session_id ? (
            <Link key={n.id} href={`/sesi/${n.session_id}`} className="block hover:bg-primary/[0.03]">{body}</Link>
          ) : (
            <div key={n.id}>{body}</div>
          )
        })}
        {(items?.length ?? 0) === 0 && <p className="p-6 text-center text-sm text-gray-400">Belum ada notifikasi.</p>}
      </div>
    </div>
  )
}
