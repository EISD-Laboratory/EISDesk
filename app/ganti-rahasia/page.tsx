import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import ChangeSecretForm from './ChangeSecretForm'

export const metadata: Metadata = { title: 'Ganti PIN / Password' }

export default async function ChangeSecretPage() {
  const profile = await requireUser({ allowMustChange: true })
  const isStaff = profile.role === 'staff'

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="card-surface overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-accent-green" />
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold text-gray-900">
            Buat <span className="text-primary">{isStaff ? 'PIN' : 'password'}</span> kamu
          </h1>
          <p className="mb-6 mt-1 text-sm text-gray-500">
            {profile.must_change_secret
              ? `Halo ${profile.full_name}, ganti ${isStaff ? 'PIN' : 'password'} sementara dari admin sebelum lanjut.`
              : `Ganti ${isStaff ? 'PIN' : 'password'} akun ${profile.code}.`}
          </p>
          <ChangeSecretForm isStaff={isStaff} />
        </div>
      </div>
    </div>
  )
}
