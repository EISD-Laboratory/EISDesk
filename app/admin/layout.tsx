import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()
  const tabs = [
    { href: '/admin', label: 'Ringkasan' },
    { href: '/admin/sesi/baru', label: 'Buat sesi' },
    { href: '/admin/pengguna', label: 'Pengguna' },
    { href: '/admin/laporan', label: 'Laporan' },
    ...(profile.role === 'super_admin'
      ? [
          { href: '/admin/hari-libur', label: 'Hari libur' },
          { href: '/admin/pengaturan', label: 'Pengaturan' },
          { href: '/admin/audit', label: 'Audit log' },
        ]
      : []),
  ]

  return (
    <div>
      <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-primary/30 hover:text-primary"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
