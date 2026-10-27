'use client'

import { useTransition } from 'react'
import toast from 'react-hot-toast'
import { Send } from 'lucide-react'
import { startTelegramLink, unlinkTelegram } from './actions'

export default function TelegramLink({ linked }: { linked: boolean }) {
  const [pending, start] = useTransition()

  return (
    <div className="card-surface flex items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-3">
        <div className="icon-chip"><Send className="h-5 w-5" strokeWidth={1.8} /></div>
        <div>
          <p className="font-semibold text-gray-900">Telegram</p>
          <p className="text-sm text-gray-500">{linked ? 'Terhubung. Notifikasi masuk ke Telegram kamu.' : 'Hubungkan supaya notifikasi masuk ke Telegram.'}</p>
        </div>
      </div>
      {linked ? (
        <button disabled={pending} className="btn-secondary shrink-0" onClick={() => start(async () => { await unlinkTelegram(); toast.success('Telegram diputus') })}>
          Putuskan
        </button>
      ) : (
        <button
          disabled={pending}
          className="btn-primary shrink-0"
          onClick={() =>
            start(async () => {
              const res = await startTelegramLink()
              if (res.error) toast.error(res.error)
              else window.open(res.url, '_blank', 'noopener')
            })
          }
        >
          Hubungkan
        </button>
      )}
    </div>
  )
}
