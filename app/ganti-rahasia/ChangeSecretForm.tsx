'use client'

import { useActionState } from 'react'
import { changeSecret } from './actions'

export default function ChangeSecretForm({ isStaff }: { isStaff: boolean }) {
  const [state, action, pending] = useActionState(changeSecret, undefined)
  const label = isStaff ? 'PIN' : 'password'
  const inputProps = isStaff
    ? { inputMode: 'numeric' as const, maxLength: 6, pattern: '\\d{6}' }
    : { minLength: 8, maxLength: 72 }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="secret" className="label">{label} baru</label>
        <input id="secret" name="secret" type="password" autoComplete="new-password" required className="input" {...inputProps} />
        <p className="mt-1.5 text-xs text-gray-400">
          {isStaff
            ? '6 digit angka, bukan angka sama/berurutan, bukan akhir NIM.'
            : 'Minimal 8 karakter dan tidak mengandung NIM.'}
        </p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">Ulangi {label} baru</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" {...inputProps} />
      </div>
      {state?.error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? 'Menyimpan…' : `Simpan ${label}`}
      </button>
    </form>
  )
}
