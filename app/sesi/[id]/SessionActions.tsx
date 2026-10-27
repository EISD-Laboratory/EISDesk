'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { CalendarCheck, CircleCheck } from 'lucide-react'
import PhotoInput from '@/components/PhotoInput'
import { wibIso } from '@/lib/time'
import {
  cancelSession,
  closeSession,
  extendSession,
  joinSession,
  leaveSession,
  openSession,
  takeOverPic,
  transferPic,
  type ActionResult,
} from '../actions'

type Props = {
  sessionId: string
  status: 'scheduled' | 'open' | 'closed' | 'cancelled' | 'merged'
  userId: string
  isAdmin: boolean
  isPic: boolean
  isToday: boolean
  joined: boolean
  attended: boolean
  date: string // yyyy-MM-dd (WIB)
  endHour: number
  closeHour: number
  admins: { id: string; label: string }[]
}

export default function SessionActions(p: Props) {
  const [pending, start] = useTransition()
  const [panel, setPanel] = useState<null | 'open' | 'close' | 'transfer' | 'extend' | 'cancel'>(null)
  const [purpose, setPurpose] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [keyPhoto, setKeyPhoto] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [target, setTarget] = useState('')
  const [newEnd, setNewEnd] = useState(p.endHour + 1)

  const active = p.status === 'scheduled' || p.status === 'open'
  if (!active) return null

  function run(action: () => Promise<ActionResult>, success: string) {
    start(async () => {
      const res = await action()
      if (res.error) toast.error(res.error)
      else {
        toast.success(success)
        setPanel(null)
      }
    })
  }

  const extendOptions = Array.from({ length: p.closeHour - p.endHour }, (_, i) => p.endHour + 1 + i)
  const otherAdmins = p.admins.filter((a) => a.id !== p.userId)

  return (
    <div className="space-y-4">
      {/* Join / hadir: semua user */}
      <div className="card-surface p-5">
        {!p.joined || (p.status === 'open' && !p.attended) ? (
          <div className="space-y-3">
            {!p.joined && (
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                maxLength={100}
                placeholder="Keperluan (opsional), mis. Radiv Data"
                className="input"
              />
            )}
            <button
              disabled={pending}
              className="btn-primary w-full"
              onClick={() => run(() => joinSession(p.sessionId, purpose), p.status === 'open' ? 'Tercatat hadir' : 'Kamu ikut sesi ini')}
            >
              {p.status === 'open' ? 'Saya hadir' : 'Ikut sesi ini'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-gray-600">
              {p.attended ? (
                <><CircleCheck className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.8} /> Kamu tercatat hadir di sesi ini.</>
              ) : (
                <><CalendarCheck className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} /> Kamu terdaftar akan hadir.</>
              )}
            </p>
            <button disabled={pending} className="btn-secondary shrink-0" onClick={() => run(() => leaveSession(p.sessionId), 'Batal ikut sesi')}>
              Batal ikut
            </button>
          </div>
        )}
      </div>

      {p.isAdmin && (
        <div className="card-surface space-y-4 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Aksi admin</p>
          <div className="flex flex-wrap gap-2">
            {p.status === 'scheduled' && p.isToday && (
              <button className="btn-primary" onClick={() => setPanel('open')}>Buka lab</button>
            )}
            {p.status === 'open' && p.isPic && (
              <button className="btn-primary" onClick={() => setPanel('close')}>Tutup lab</button>
            )}
            {p.isPic && otherAdmins.length > 0 && (
              <button className="btn-secondary" onClick={() => setPanel('transfer')}>Alihkan PJ</button>
            )}
            {!p.isPic && (
              <button disabled={pending} className="btn-secondary" onClick={() => run(() => takeOverPic(p.sessionId), 'Kamu sekarang PJ sesi ini')}>
                Ambil alih PJ
              </button>
            )}
            {extendOptions.length > 0 && (
              <button className="btn-secondary" onClick={() => setPanel('extend')}>Perpanjang</button>
            )}
            {p.status === 'scheduled' && (
              <button className="btn-secondary text-red-600 hover:text-red-700" onClick={() => setPanel('cancel')}>Batalkan</button>
            )}
          </div>

          {panel === 'open' && (
            <div className="space-y-3 rounded-xl bg-gray-50 p-4">
              <PhotoInput userId={p.userId} label="Foto kondisi lab saat dibuka" onChange={setPhoto} />
              <button
                disabled={pending || !photo}
                className="btn-primary w-full"
                onClick={() => run(() => openSession(p.sessionId, photo!), 'Lab dibuka, staff sudah diberi tahu')}
              >
                Konfirmasi buka lab
              </button>
            </div>
          )}

          {panel === 'close' && (
            <div className="space-y-3 rounded-xl bg-gray-50 p-4">
              <PhotoInput userId={p.userId} label="Foto kondisi lab saat ditutup" onChange={setPhoto} />
              <PhotoInput userId={p.userId} label="Foto kunci sudah di brankas" onChange={setKeyPhoto} />
              <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Catatan (opsional)" className="input" rows={2} />
              <button
                disabled={pending || !photo || !keyPhoto}
                className="btn-primary w-full"
                onClick={() => run(() => closeSession(p.sessionId, photo!, keyPhoto!, text), 'Lab ditutup')}
              >
                Konfirmasi tutup lab
              </button>
            </div>
          )}

          {panel === 'transfer' && (
            <div className="space-y-3 rounded-xl bg-gray-50 p-4">
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="input">
                <option value="">Pilih admin tujuan…</option>
                {otherAdmins.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <button
                disabled={pending || !target}
                className="btn-primary w-full"
                onClick={() => run(() => transferPic(p.sessionId, target), 'PJ dialihkan')}
              >
                Alihkan PJ
              </button>
            </div>
          )}

          {panel === 'extend' && (
            <div className="space-y-3 rounded-xl bg-gray-50 p-4">
              <select value={newEnd} onChange={(e) => setNewEnd(Number(e.target.value))} className="input">
                {extendOptions.map((h) => <option key={h} value={h}>Sampai {String(h).padStart(2, '0')}:00</option>)}
              </select>
              <p className="text-xs text-gray-500">Sesi terjadwal yang tertabrak akan otomatis digabung ke sesi ini, dan PJ pindah ke PJ sesi itu.</p>
              <button
                disabled={pending}
                className="btn-primary w-full"
                onClick={() => run(() => extendSession(p.sessionId, wibIso(p.date, newEnd)), 'Sesi diperpanjang')}
              >
                Perpanjang
              </button>
            </div>
          )}

          {panel === 'cancel' && (
            <div className="space-y-3 rounded-xl bg-gray-50 p-4">
              <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Alasan pembatalan (wajib)" className="input" rows={2} />
              <button
                disabled={pending || !text.trim()}
                className="btn-danger w-full"
                onClick={() => run(() => cancelSession(p.sessionId, text), 'Sesi dibatalkan')}
              >
                Batalkan sesi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
