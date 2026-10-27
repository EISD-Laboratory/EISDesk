'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function startTelegramLink(): Promise<{ url?: string; error?: string }> {
  const bot = process.env.TELEGRAM_BOT_USERNAME
  if (!bot) return { error: 'Bot Telegram belum dikonfigurasi' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_telegram_link_token')
  if (error) return { error: error.message }
  return { url: `https://t.me/${bot}?start=${data}` }
}

export async function unlinkTelegram() {
  const supabase = await createClient()
  await supabase.rpc('unlink_telegram')
  revalidatePath('/profil')
}
