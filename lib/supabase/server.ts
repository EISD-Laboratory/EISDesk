import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'
import { supabaseEnv } from './env'

// Client per-request yang bertindak sebagai user yang sedang login (RLS berlaku)
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    ...supabaseEnv(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Dipanggil dari Server Component: cookie disegarkan oleh proxy.ts
          }
        },
      },
    },
  )
}
