import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { fmtDate, isDateStr, todayWib, wibIso } from '@/lib/time'

export const metadata: Metadata = { title: 'Hari Libur' }

async function addHoliday(formData: FormData) {
  'use server'
  await requireSuperAdmin()
  const date = String(formData.get('date'))
  const name = String(formData.get('name') ?? '').trim()
  const type = formData.get('type') === 'cuti_bersama' ? 'cuti_bersama' : formData.get('type') === 'nasional' ? 'nasional' : 'manual'
  if (!isDateStr(date) || !name) redirect('/admin/hari-libur?error=1')
  const supabase = await createClient()
  await supabase.from('holidays').upsert({ date, name, type, source: 'manual' })
  revalidatePath('/', 'layout')
}

async function removeHoliday(formData: FormData) {
  'use server'
  await requireSuperAdmin()
  const supabase = await createClient()
  await supabase.from('holidays').delete().eq('date', String(formData.get('date')))
  revalidatePath('/', 'layout')
}

export default async function HolidaysPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireSuperAdmin()
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: holidays } = await supabase.from('holidays').select('*').gte('date', todayWib().slice(0, 4) + '-01-01').order('date')

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Hari Libur"
        title="Tanggal"
        highlight="lab tutup"
        subtitle="Minggu otomatis tutup. Tambahkan tanggal merah & cuti bersama di sini. Sesi tidak bisa dijadwalkan di tanggal ini."
      />

      <form action={addHoliday} className="card-surface mb-6 grid gap-3 p-5 sm:grid-cols-[auto_1fr_auto_auto]">
        <input type="date" name="date" required className="input" />
        <input name="name" required maxLength={100} placeholder="Nama (mis. Hari Natal)" className="input" />
        <select name="type" className="input">
          <option value="nasional">Libur nasional</option>
          <option value="cuti_bersama">Cuti bersama</option>
          <option value="manual">Lainnya</option>
        </select>
        <button className="btn-primary">Tambah</button>
        {error && <p className="text-sm text-red-600 sm:col-span-4">Tanggal dan nama wajib diisi.</p>}
      </form>

      <div className="card-surface divide-y divide-gray-100">
        {(holidays ?? []).map((h) => (
          <div key={h.date} className={`flex items-center justify-between gap-3 p-4 ${h.date < todayWib() ? 'opacity-50' : ''}`}>
            <div>
              <p className="font-medium text-gray-900">{h.name}</p>
              <p className="text-sm text-gray-500">
                {fmtDate(wibIso(h.date, 12))} · {h.type === 'cuti_bersama' ? 'Cuti bersama' : h.type === 'nasional' ? 'Libur nasional' : 'Lainnya'}
              </p>
            </div>
            <form action={removeHoliday}>
              <input type="hidden" name="date" value={h.date} />
              <button aria-label="Hapus" className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </form>
          </div>
        ))}
        {(holidays?.length ?? 0) === 0 && <p className="p-6 text-center text-sm text-gray-400">Belum ada tanggal libur tahun ini.</p>}
      </div>
    </div>
  )
}
