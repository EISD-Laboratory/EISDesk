'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { AlertTriangle } from 'lucide-react'
import PhotoInput from '@/components/PhotoInput'
import { CATEGORY_LABEL, type SessionCategory } from '@/lib/labels'
import { createSession, openNow } from './actions'

type Props = {
  userId: string
  today: string
  nowHour: number
  openHour: number
  closeHour: number
  holidays: Record<string, string>
}

const pad = (h: number) => `${String(h).padStart(2, '0')}:00`

export default function NewSessionForm({ userId, today, nowHour, openHour, closeHour, holidays }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [mode, setMode] = useState<'schedule' | 'now'>('schedule')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<SessionCategory>('belajar')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(today)
  const [startHour, setStartHour] = useState(Math.max(openHour, Math.min(nowHour + 1, closeHour - 1)))
  const [endHour, setEndHour] = useState(Math.min(startHour + 2, closeHour))
  const [nowEnd, setNowEnd] = useState(Math.min(nowHour + 2, closeHour))
  const [photo, setPhoto] = useState<string | null>(null)

  const dateObj = new Date(`${date}T12:00:00+07:00`)
  const warning = dateObj.getUTCDay() === 0 ? 'Hari Minggu, lab tutup' : holidays[date] ? `Tanggal merah: ${holidays[date]}, lab tutup` : null
  const nowWarning =
    new Date(`${today}T12:00:00+07:00`).getUTCDay() === 0
      ? 'Hari Minggu, lab tutup'
      : holidays[today]
        ? `Tanggal merah: ${holidays[today]}, lab tutup`
        : nowHour < openHour || nowHour >= closeHour
          ? `Di luar jam operasional (${pad(openHour)}–${pad(closeHour)})`
          : null

  const hours = Array.from({ length: closeHour - openHour + 1 }, (_, i) => openHour + i)

  function submit() {
    start(async () => {
      const common = { title, category, description }
      const res =
        mode === 'schedule'
          ? await createSession({ ...common, date, startHour, endHour })
          : await openNow({ ...common, date: today, endHour: nowEnd, photoPath: photo ?? '' })
      if (res.error) toast.error(res.error)
      else {
        toast.success(mode === 'schedule' ? 'Sesi dijadwalkan' : 'Lab dibuka, staff sudah diberi tahu')
        router.push(`/sesi/${res.id}`)
      }
    })
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="grid grid-cols-2 border-b border-gray-100 text-sm font-semibold">
        {(['schedule', 'now'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`py-3 transition-colors ${mode === m ? 'bg-primary/5 text-primary' : 'text-gray-500 hover:text-primary'}`}
          >
            {m === 'schedule' ? 'Jadwalkan sesi' : 'Buka lab sekarang'}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-6">
        <div>
          <label className="label" htmlFor="title">Judul kegiatan</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="mis. Belajar bareng Next.js" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="category">Kategori</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value as SessionCategory)} className="input">
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="description">Deskripsi (opsional)</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2} className="input" />
        </div>

        {mode === 'schedule' ? (
          <>
            <div>
              <label className="label" htmlFor="date">Tanggal</label>
              <input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="start">Mulai</label>
                <select id="start" value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className="input">
                  {hours.slice(0, -1).map((h) => <option key={h} value={h}>{pad(h)}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="end">Selesai</label>
                <select id="end" value={endHour} onChange={(e) => setEndHour(Number(e.target.value))} className="input">
                  {hours.filter((h) => h > startHour).map((h) => <option key={h} value={h}>{pad(h)}</option>)}
                </select>
              </div>
            </div>
            {warning && <Warning text={warning} />}
          </>
        ) : (
          <>
            <div>
              <label className="label" htmlFor="nowEnd">Rencana selesai</label>
              <select id="nowEnd" value={nowEnd} onChange={(e) => setNowEnd(Number(e.target.value))} className="input">
                {hours.filter((h) => h > nowHour).map((h) => <option key={h} value={h}>{pad(h)}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-gray-400">Sesi dimulai {pad(nowHour)} (jam berjalan) dan langsung dibuka atas nama kamu sebagai PJ.</p>
            </div>
            <PhotoInput userId={userId} label="Foto kondisi lab saat dibuka" onChange={setPhoto} />
            {nowWarning && <Warning text={nowWarning} />}
          </>
        )}

        <button
          type="button"
          disabled={pending || !title.trim() || (mode === 'now' && !photo)}
          onClick={submit}
          className="btn-primary w-full"
        >
          {pending ? 'Menyimpan…' : mode === 'schedule' ? 'Jadwalkan sesi' : 'Buka lab sekarang'}
        </button>
      </div>
    </div>
  )
}

function Warning({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">
      <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.8} /> {text}
    </p>
  )
}
