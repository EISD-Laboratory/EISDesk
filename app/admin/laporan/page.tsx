import type { Metadata } from 'next'
import Link from 'next/link'
import { Download } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { requireAdmin } from '@/lib/auth'
import { CATEGORY_LABEL, type SessionCategory } from '@/lib/labels'
import { hoursUsed, loadMonth } from '@/lib/report'
import { fmt, todayWib, wibIso } from '@/lib/time'

export const metadata: Metadata = { title: 'Laporan' }

const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  await requireAdmin()
  const { bulan } = await searchParams
  const month = bulan && /^\d{4}-\d{2}$/.test(bulan) ? bulan : todayWib().slice(0, 7)
  const sessions = await loadMonth(month)

  const totalHours = sessions.reduce((a, s) => a + hoursUsed(s), 0)
  const byCategory = new Map<SessionCategory, number>()
  const attendance = new Map<string, { name: string; count: number }>()
  const opened = new Map<string, number>()
  for (const s of sessions) {
    byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + hoursUsed(s))
    if (s.opener) opened.set(`${s.opener.full_name} (${s.opener.code})`, (opened.get(`${s.opener.full_name} (${s.opener.code})`) ?? 0) + 1)
    for (const p of s.session_participants) {
      if (!p.attended_at || !p.profile) continue
      const cur = attendance.get(p.profile.id) ?? { name: `${p.profile.full_name} (${p.profile.code})`, count: 0 }
      attendance.set(p.profile.id, { ...cur, count: cur.count + 1 })
    }
  }
  const topMembers = [...attendance.values()].sort((a, b) => b.count - a.count).slice(0, 10)
  const maxCat = Math.max(1, ...byCategory.values())

  return (
    <div>
      <PageHeader
        eyebrow="Laporan"
        title="Rekap"
        highlight={fmt(wibIso(`${month}-01`, 12), 'MMMM yyyy')}
        action={
          <a href={`/admin/laporan/csv?bulan=${month}`} className="btn-secondary self-start">
            <Download className="h-4 w-4" strokeWidth={1.8} /> Export CSV
          </a>
        }
      />
      <div className="mb-6 flex gap-2">
        <Link href={`/admin/laporan?bulan=${shiftMonth(month, -1)}`} className="btn-secondary">← Bulan lalu</Link>
        <Link href={`/admin/laporan?bulan=${shiftMonth(month, 1)}`} className="btn-secondary">Bulan depan →</Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Sesi lab', value: sessions.length },
          { label: 'Jam lab terpakai', value: totalHours.toFixed(1) },
          { label: 'Anggota hadir (unik)', value: attendance.size },
        ].map((k) => (
          <div key={k.label} className="card-surface p-5">
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className="mt-1 text-3xl font-extrabold text-gray-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card-surface p-5">
          <h2 className="mb-4 font-bold text-gray-900">Jam per kategori</h2>
          <div className="space-y-3">
            {[...byCategory].sort((a, b) => b[1] - a[1]).map(([cat, h]) => (
              <div key={cat}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-gray-700">{CATEGORY_LABEL[cat]}</span><span className="text-gray-500">{h.toFixed(1)} jam</span></div>
                <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-primary" style={{ width: `${(h / maxCat) * 100}%` }} /></div>
              </div>
            ))}
            {byCategory.size === 0 && <p className="text-sm text-gray-400">Belum ada data.</p>}
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-4 font-bold text-gray-900">Paling sering hadir</h2>
          <ol className="space-y-2 text-sm">
            {topMembers.map((m, i) => (
              <li key={m.name} className="flex justify-between"><span className="text-gray-700">{i + 1}. {m.name}</span><span className="text-gray-500">{m.count} sesi</span></li>
            ))}
            {topMembers.length === 0 && <p className="text-gray-400">Belum ada data.</p>}
          </ol>
        </section>

        <section className="card-surface p-5 md:col-span-2">
          <h2 className="mb-4 font-bold text-gray-900">Admin yang membuka lab</h2>
          <div className="flex flex-wrap gap-2">
            {[...opened].sort((a, b) => b[1] - a[1]).map(([name, n]) => (
              <span key={name} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">{name} · {n}×</span>
            ))}
            {opened.size === 0 && <p className="text-sm text-gray-400">Belum ada data.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
