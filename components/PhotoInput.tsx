'use client'

import { useState } from 'react'
import { Camera, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const MAX_EDGE = 1600

// Kompres di browser (canvas, tanpa library) supaya foto HP ~200–400 KB
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal memproses foto'))), 'image/jpeg', 0.8),
  )
}

// Unggah ke session-photos/<uid>/<uuid>.jpg lalu kembalikan path-nya lewat onChange
export default function PhotoInput({
  userId,
  label,
  onChange,
}: {
  userId: string
  label: string
  onChange: (path: string | null) => void
}) {
  const [state, setState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [preview, setPreview] = useState<string | null>(null)

  async function handle(file: File | undefined) {
    if (!file) return
    setState('uploading')
    onChange(null)
    try {
      const blob = await compress(file)
      const path = `${userId}/${crypto.randomUUID()}.jpg`
      const { error } = await createClient().storage.from('session-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      setPreview(URL.createObjectURL(blob))
      setState('done')
      onChange(path)
    } catch {
      setState('error')
    }
  }

  return (
    <label className="block cursor-pointer">
      <span className="label">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white p-3 transition hover:border-primary/40">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <div className="icon-chip h-14 w-14">
            <Camera className="h-6 w-6" strokeWidth={1.8} />
          </div>
        )}
        <span className="text-sm text-gray-600">
          {state === 'uploading' && (
            <span className="inline-flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Mengunggah…</span>
          )}
          {state === 'done' && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Foto siap · ketuk untuk ganti</span>
          )}
          {state === 'error' && <span className="text-red-600">Gagal mengunggah, coba lagi</span>}
          {state === 'idle' && 'Ambil / pilih foto'}
        </span>
      </div>
      <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => handle(e.target.files?.[0])} />
    </label>
  )
}
