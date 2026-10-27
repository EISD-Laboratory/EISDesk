import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { supabaseEnv } from './env'

// Service role: melewati RLS. Hanya untuk login guard & operasi Auth (buat akun, reset, ban).
export function createAdminClient() {
  const [url] = supabaseEnv()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error('Env SUPABASE_SERVICE_ROLE_KEY (atau SUPABASE_SECRET_KEY) belum diisi.')
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
