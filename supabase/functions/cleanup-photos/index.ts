// Hapus foto sesi yang lebih tua dari settings.photo_retention_days (default 90 hari).
// File Storage harus dihapus lewat Storage API, bukan DELETE langsung di SQL.
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async () => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: settings } = await db.from('settings').select('photo_retention_days').single()
  const days = settings?.photo_retention_days ?? 90
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: sessions, error } = await db
    .from('lab_sessions')
    .select('id, open_photo_path, close_room_photo_path, close_key_photo_path')
    .is('photos_deleted_at', null)
    .not('open_photo_path', 'is', null)
    .lt('opened_at', cutoff)
    .in('status', ['closed', 'merged', 'cancelled'])
    .limit(200)
  if (error) return new Response(error.message, { status: 500 })

  let cleaned = 0
  for (const s of sessions ?? []) {
    const paths = [s.open_photo_path, s.close_room_photo_path, s.close_key_photo_path].filter(Boolean) as string[]
    const { error: rmError } = await db.storage.from('session-photos').remove(paths)
    if (rmError) continue
    await db.from('lab_sessions').update({ photos_deleted_at: new Date().toISOString() }).eq('id', s.id)
    cleaned++
  }
  return new Response(`cleaned ${cleaned}`)
})
