'use client'

import { useActionState } from 'react'
import { login } from './actions'

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="nim" className="label">NIM</label>
        <input
          id="nim"
          name="nim"
          inputMode="numeric"
          autoComplete="username"
          required
          className="input"
          onInput={(e) => (e.currentTarget.value = e.currentTarget.value.replace(/\D/g, ''))}
        />
      </div>
      <div>
        <label htmlFor="secret" className="label">PIN / Password</label>
        <input id="secret" name="secret" type="password" autoComplete="current-password" required className="input" />
        <p className="mt-1.5 text-xs text-gray-400">Staff: PIN 6 digit. Admin: password.</p>
      </div>
      {state?.error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? 'Memproses…' : 'Masuk'}
      </button>
      <p className="text-center text-xs text-gray-400">Lupa PIN/password? Hubungi admin lab untuk reset.</p>
    </form>
  )
}
