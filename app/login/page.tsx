import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Masuk' }

export default async function LoginPage() {
  if (await getProfile()) redirect('/jadwal')

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="card-surface overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary to-accent-green" />
        <div className="p-6 sm:p-8">
          <Image src="/images/logo.png" alt="Logo EISD" width={48} height={48} className="mb-4 h-12 w-12" />
          <h1 className="text-2xl font-extrabold text-gray-900">
            Masuk ke <span className="text-primary">EISDesk</span>
          </h1>
          <p className="mb-6 mt-1 text-sm text-gray-500">Pakai NIM dan PIN/password dari admin lab.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
