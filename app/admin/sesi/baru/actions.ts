'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { wibIso } from '@/lib/time'

const base = z.object({
  title: z.string().trim().min(1, 'Judul wajib diisi').max(100),
  category: z.enum(['belajar', 'radiv', 'rapat', 'kegiatan', 'lainnya']),
  description: z.string().trim().max(1000).optional(),
})

const scheduleSchema = base.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid'),
  startHour: z.coerce.number().int().min(0).max(23),
  endHour: z.coerce.number().int().min(1).max(24),
})

const openNowSchema = base.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endHour: z.coerce.number().int().min(1).max(24),
  photoPath: z.string().min(1, 'Foto kondisi lab wajib diunggah'),
})

export type CreateResult = { error?: string; id?: string }

export async function createSession(input: unknown): Promise<CreateResult> {
  const parsed = scheduleSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const v = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_session', {
    p_title: v.title,
    p_category: v.category,
    p_start: wibIso(v.date, v.startHour),
    p_end: wibIso(v.date, v.endHour),
    p_description: v.description || undefined,
  })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { id: data }
}

export async function openNow(input: unknown): Promise<CreateResult> {
  const parsed = openNowSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const v = parsed.data

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('open_session_now', {
    p_title: v.title,
    p_category: v.category,
    p_end: wibIso(v.date, v.endHour),
    p_photo_path: v.photoPath,
    p_description: v.description || undefined,
  })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { id: data }
}
