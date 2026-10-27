import { timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Webhook bot Telegram. Menangani "/start <token>" dari deep link di halaman profil.
// Daftarkan: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>

function validSecret(header: string | null) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected || !header || header.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected))
}

async function reply(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

export async function POST(request: Request) {
  if (!validSecret(request.headers.get('x-telegram-bot-api-secret-token'))) {
    return new Response('forbidden', { status: 403 })
  }

  const update = await request.json().catch(() => null)
  const message = update?.message
  const chatId: number | undefined = message?.chat?.id
  const text: string = message?.text ?? ''
  if (!chatId) return Response.json({ ok: true })

  // Grup admin: kirim /chatid di grup untuk tahu ID-nya (diisi super admin di Pengaturan)
  if (text.startsWith('/chatid')) {
    await reply(chatId, `Chat ID: ${chatId}`)
    return Response.json({ ok: true })
  }

  const token = text.match(/^\/start\s+([A-Za-z0-9_-]+)$/)?.[1]
  if (!token || message.chat.type !== 'private') {
    await reply(chatId, 'Halo! Hubungkan akun EISDesk lewat tombol "Hubungkan Telegram" di halaman Profil.')
    return Response.json({ ok: true })
  }

  const { data: name } = await createAdminClient().rpc('link_telegram', { p_token: token, p_chat_id: chatId })
  await reply(
    chatId,
    name
      ? `Terhubung sebagai ${name}. Notifikasi EISDesk akan masuk ke sini.`
      : 'Link sudah kedaluwarsa atau tidak valid. Buat link baru dari halaman Profil.',
  )
  return Response.json({ ok: true })
}
