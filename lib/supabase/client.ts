import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { supabaseEnv } from './env'

export function createClient() {
  return createBrowserClient<Database>(...supabaseEnv())
}
