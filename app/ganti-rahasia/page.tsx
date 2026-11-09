import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import ChangeSecretForm from './ChangeSecretForm'

export const metadata: Metadata = { title: 'Ganti PIN / Password' }

export default async function ChangeSecretPage() {
  const profile = await requireUser({ allowMustChange: true })
  const isStaff = profile.role === 'staff'
  const label = isStaff ? 'PIN' : 'password'

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="card-surface overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-accent-green" />
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold text-gray-900">
            {profile.must_change_secret ? 'Buat' : 'Ganti'} <span className="text-primary">{label}</span> kamu
          </h1>
          {profile.must_change_secret ? (
            <div className="mb-6 mt-2 space-y-2 text-sm text-gray-500">
              <p>Halo {profile.full_name}, selamat datang di EISDesk.</p>
              <p>
                {isStaff ? 'PIN' : 'Password'} dari admin hanya sementara. Buat {label} milikmu sendiri sekarang; setelah itu
                login selalu pakai NIM + {label} baru ini. Admin pun tidak bisa melihatnya.
              </p>
            </div>
          ) : (
            <p className="mb-6 mt-1 text-sm text-gray-500">Ganti {label} akun {profile.code}.</p>
          )}
          <ChangeSecretForm isStaff={isStaff} />
        </div>
      </div>
    </div>
  )
}
