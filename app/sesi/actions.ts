'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { error?: string }

// Semua aturan (hak akses, foto wajib, PJ, bentrok) dicek di RPC database; di sini cuma meneruskan.
async function call(fn: () => PromiseLike<{ error: { message: string } | null }>): Promise<ActionResult> {
  const { error } = await fn()
  revalidatePath('/', 'layout')
  return error ? { error: error.message } : {}
}

export async function joinSession(id: string, purpose: string) {
  const supabase = await createClient()
  return call(() => supabase.rpc('join_session', { p_session_id: id, p_purpose: purpose || undefined }))
}

export async function leaveSession(id: string) {
  const supabase = await createClient()
  return call(() => supabase.rpc('leave_session', { p_session_id: id }))
}

export async function openSession(id: string, photoPath: string) {
  const supabase = await createClient()
  return call(() => supabase.rpc('open_session', { p_session_id: id, p_photo_path: photoPath }))
}

export async function transferPic(id: string, toAdmin: string) {
  const supabase = await createClient()
  return call(() => supabase.rpc('transfer_pic', { p_session_id: id, p_to_admin: toAdmin }))
}

export async function takeOverPic(id: string) {
  const supabase = await createClient()
  return call(() => supabase.rpc('take_over_pic', { p_session_id: id }))
}

export async function extendSession(id: string, newEnd: string) {
  const supabase = await createClient()
  return call(() => supabase.rpc('extend_session', { p_session_id: id, p_new_end: newEnd }))
}

export async function closeSession(id: string, roomPhoto: string, keyPhoto: string, note: string) {
  const supabase = await createClient()
  return call(() =>
    supabase.rpc('close_session', {
      p_session_id: id,
      p_room_photo_path: roomPhoto,
      p_key_photo_path: keyPhoto,
      p_note: note || undefined,
    }),
  )
}

export async function cancelSession(id: string, reason: string) {
  const supabase = await createClient()
  return call(() => supabase.rpc('cancel_session', { p_session_id: id, p_reason: reason }))
}
