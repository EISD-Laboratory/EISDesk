// Env publik Supabase. Key boleh pakai nama lama (ANON_KEY) atau nama baru dari
// dashboard Supabase (PUBLISHABLE_KEY). Ditulis literal supaya di-inline Next saat build.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export function supabaseEnv(): [string, string] {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      'Env Supabase belum diisi: set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY (atau NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), lalu build ulang.',
    )
  }
  return [SUPABASE_URL, SUPABASE_KEY]
}
