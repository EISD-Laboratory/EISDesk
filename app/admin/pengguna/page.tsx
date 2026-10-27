import type { Metadata } from 'next'
import PageHeader from '@/components/PageHeader'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import UsersManager from './UsersManager'

export const metadata: Metadata = { title: 'Pengguna' }

export default async function UsersPage() {
  const me = await requireAdmin()
  // NIM tidak di-grant ke klien; admin butuh untuk identifikasi, jadi dibaca server setelah cek role
  const { data: users } = await createAdminClient()
    .from('profiles')
    .select('id, nim, full_name, code, role, is_active, must_change_secret, angkatan, divisi')
    .order('is_active', { ascending: false })
    .order('role', { ascending: false })
    .order('full_name')

  return (
    <div>
      <PageHeader
        eyebrow="Pengguna"
        title="Kelola"
        highlight="akun lab"
        subtitle={
          me.role === 'super_admin'
            ? 'Kamu bisa mengelola semua akun termasuk admin.'
            : 'Kamu bisa membuat dan mengelola akun staff. Akun admin dikelola super admin.'
        }
      />
      <UsersManager users={users ?? []} meId={me.id} isSuperAdmin={me.role === 'super_admin'} />
    </div>
  )
}
