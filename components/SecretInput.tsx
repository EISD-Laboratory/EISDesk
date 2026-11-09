'use client'

import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Input PIN/password dengan tombol mata untuk menampilkan/menyembunyikan isinya
export default function SecretInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`input pr-11 ${props.className ?? ''}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Sembunyikan' : 'Tampilkan'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-gray-400 transition-colors hover:text-primary"
      >
        {visible ? <EyeOff className="h-5 w-5" strokeWidth={1.8} /> : <Eye className="h-5 w-5" strokeWidth={1.8} />}
      </button>
    </div>
  )
}
