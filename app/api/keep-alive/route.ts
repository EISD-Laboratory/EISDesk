import { createAdminClient } from '@/lib/supabase/admin'

// Dipanggil Vercel cron harian (vercel.json) supaya project Supabase free tier tidak di-pause
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('forbidden', { status: 403 })
  }
  const { error } = await createAdminClient().from('settings').select('open_hour').single()
  return Response.json({ ok: !error })
}
