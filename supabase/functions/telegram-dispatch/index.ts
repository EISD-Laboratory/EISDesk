// Kirim notifikasi yang belum terkirim ke Telegram. Dipanggil pg_cron tiap menit.
// Notifikasi user_id null = grup admin (settings.admin_telegram_chat_id).
import { createClient } from 'npm:@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const APP_URL = Deno.env.get('APP_URL') // mis. https://eisdesk.vercel.app

Deno.serve(async () => {
  if (!BOT_TOKEN) return new Response('TELEGRAM_BOT_TOKEN belum diset', { status: 200 })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: pending, error } = await db
    .from('notifications')
    .select('id, user_id, session_id, message, profile:profiles(telegram_chat_id)')
    .is('telegram_sent_at', null)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('id')
    .limit(100)
  if (error) return new Response(error.message, { status: 500 })
  if (!pending?.length) return new Response('ok')

  const { data: settings } = await db.from('settings').select('admin_telegram_chat_id').single()

  const sent: number[] = []
  for (const n of pending) {
    // deno-lint-ignore no-explicit-any
    const chatId = n.user_id ? (n.profile as any)?.telegram_chat_id : settings?.admin_telegram_chat_id
    if (chatId) {
      const link = APP_URL && n.session_id ? `\n${APP_URL}/sesi/${n.session_id}` : ''
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: n.message + link, disable_web_page_preview: true }),
      })
      // 429/5xx: biarkan untuk dicoba lagi menit berikutnya
      if (res.status === 429 || res.status >= 500) continue
    }
    // Tanpa chat_id (belum hubungkan Telegram) atau sudah terkirim: tandai supaya tidak diulang
    sent.push(n.id)
  }

  if (sent.length) {
    await db.from('notifications').update({ telegram_sent_at: new Date().toISOString() }).in('id', sent)
  }
  return new Response(`sent ${sent.length}`)
})
