import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { fmt } from '@/lib/time'

export const metadata: Metadata = { title: 'Audit Log' }

const ENTITY: Record<string, string> = { lab_sessions: 'Sesi', profiles: 'Akun', holidays: 'Hari libur', settings: 'Pengaturan' }

// Ringkas perubahan: kolom yang berubah saja (update), tanpa kolom teknis
function diff(oldData: unknown, newData: unknown) {
  const o = (oldData ?? {}) as Record<string, unknown>
  const n = (newData ?? {}) as Record<string, unknown>
  return Object.keys({ ...o, ...n })
    .filter((k) => !['updated_at', 'created_at', 'auth_email'].includes(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]))
    .map((k) => `${k}: ${o[k] ?? '∅'} → ${n[k] ?? '∅'}`)
}

export default async function AuditPage() {
  await requireSuperAdmin()
  const supabase = await createClient()
  const [{ data: logs }, { data: people }] = await Promise.all([
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('profiles').select('id, full_name, code'),
  ])
  const nameOf = new Map((people ?? []).map((p) => [p.id, `${p.full_name} (${p.code})`]))

  return (
    <div>
      <PageHeader eyebrow="Audit" title="Audit" highlight="log" subtitle="200 perubahan data terakhir." />
      <div className="card-surface divide-y divide-gray-100">
        {(logs ?? []).map((l) => (
          <details key={l.id} className="group p-4">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 text-sm">
              <span className="text-gray-400">{fmt(l.created_at, 'd MMM HH:mm')}</span>
              <span className="font-medium text-gray-900">{l.actor_id ? nameOf.get(l.actor_id) ?? 'User' : 'Sistem'}</span>
              <span className="text-gray-500">{l.action}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{ENTITY[l.entity] ?? l.entity}</span>
              <span className="truncate text-gray-500">
                {(l.new_data as { title?: string; full_name?: string; name?: string } | null)?.title ??
                  (l.new_data as { full_name?: string } | null)?.full_name ??
                  (l.new_data as { name?: string } | null)?.name ??
                  l.entity_id}
              </span>
            </summary>
            <ul className="mt-2 space-y-0.5 pl-2 font-mono text-xs text-gray-500">
              {diff(l.old_data, l.new_data).map((d) => <li key={d} className="break-all">{d}</li>)}
            </ul>
          </details>
        ))}
        {(logs?.length ?? 0) === 0 && <p className="p-6 text-center text-sm text-gray-400">Belum ada log.</p>}
      </div>
    </div>
  )
}
