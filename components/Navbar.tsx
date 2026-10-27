import Image from 'next/image'
import Link from 'next/link'
import { Bell, Menu } from 'lucide-react'
import { getProfile, isAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/actions'

export default async function Navbar() {
  const profile = await getProfile()

  let unread = 0
  if (profile) {
    const supabase = await createClient()
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null)
    unread = count ?? 0
  }

  const links = [
    { href: '/jadwal', label: 'Jadwal' },
    ...(profile ? [{ href: '/profil', label: 'Profil' }] : []),
    ...(profile && isAdmin(profile.role) ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 navbar-glass">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/jadwal" className="flex items-center gap-2.5">
          <Image src="/images/logo.png" alt="Logo EISD" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="text-sm font-bold text-gray-900">
            EISD<span className="text-primary">esk</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-gray-600 transition-colors hover:text-primary">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <Link href="/notifikasi" aria-label="Notifikasi" className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-primary/5 hover:text-primary">
                <Bell className="h-5 w-5" strokeWidth={1.8} />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-green px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <form action={signOut} className="hidden md:block">
                <button className="btn-secondary px-4 py-2">Keluar</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn border-2 border-primary px-5 py-2 text-primary hover:bg-primary hover:text-white">
              Masuk
            </Link>
          )}

          <details className="relative md:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100/50">
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            </summary>
            <div className="absolute right-0 mt-2 w-48 space-y-1 rounded-2xl border border-gray-100 bg-white p-2 shadow-card">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-primary/5 hover:text-primary">
                  {l.label}
                </Link>
              ))}
              {profile && (
                <form action={signOut}>
                  <button className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">Keluar</button>
                </form>
              )}
            </div>
          </details>
        </div>
      </nav>
    </header>
  )
}
