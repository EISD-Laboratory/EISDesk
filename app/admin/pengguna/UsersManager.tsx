'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { FileSpreadsheet, UserPlus, X } from 'lucide-react'
import { DIVISIONS, ROLE_LABEL } from '@/lib/labels'
import { createAccount, resetSecret, setActive, setRole, updateAccount, type UserActionResult } from './actions'
import ImportStaff from './ImportStaff'

type Role = keyof typeof ROLE_LABEL
type User = {
  id: string
  nim: string
  full_name: string
  code: string
  role: Role
  is_active: boolean
  must_change_secret: boolean
  angkatan: number | null
  divisi: string | null
}
type Editing = { id: string; fullName: string; code: string; angkatan: string; divisi: string }

const EMPTY_FORM = { nim: '', fullName: '', code: '', angkatan: '', divisi: '', role: 'staff' as Role }

export default function UsersManager({ users, meId, isSuperAdmin }: { users: User[]; meId: string; isSuperAdmin: boolean }) {
  const [pending, start] = useTransition()
  const [panel, setPanel] = useState<'create' | 'import' | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [reveal, setReveal] = useState<{ who: string; label: string; secret: string } | null>(null)
  const [query, setQuery] = useState('')

  const canManage = (u: User) => isSuperAdmin || u.role === 'staff'
  const secretName = (role: Role) => (role === 'staff' ? 'PIN' : 'password')

  function run(action: () => Promise<UserActionResult>, onOk: (r: UserActionResult) => void) {
    start(async () => {
      const res = await action()
      if (res.error) toast.error(res.error)
      else onOk(res)
    })
  }

  const filtered = users.filter((u) =>
    `${u.full_name} ${u.code} ${u.nim} ${u.divisi ?? ''} ${u.angkatan ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  )
  const togglePanel = (p: 'create' | 'import') => setPanel((cur) => (cur === p ? null : p))

  return (
    <div className="space-y-4">
      {reveal && (
        <div className="rounded-2xl border border-accent-green/40 bg-accent-green/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-700">
                {reveal.label} sementara untuk <b>{reveal.who}</b> (hanya ditampilkan sekali, sampaikan langsung ke orangnya):
              </p>
              <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-gray-900">{reveal.secret}</p>
              <p className="mt-1 text-xs text-gray-500">Wajib diganti saat login pertama.</p>
            </div>
            <button onClick={() => setReveal(null)} aria-label="Tutup" className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, kode, NIM, divisi…" className="input sm:max-w-xs" />
        <button onClick={() => togglePanel('import')} className="btn-secondary sm:ml-auto">
          <FileSpreadsheet className="h-4 w-4" strokeWidth={1.8} /> Import Excel
        </button>
        <button onClick={() => togglePanel('create')} className="btn-primary">
          <UserPlus className="h-4 w-4" strokeWidth={1.8} /> Tambah akun
        </button>
      </div>

      {panel === 'import' && <ImportStaff onClose={() => setPanel(null)} />}

      {panel === 'create' && (
        <div className="card-surface grid gap-3 p-5 sm:grid-cols-2">
          <input placeholder="NIM" inputMode="numeric" value={form.nim} onChange={(e) => setForm({ ...form, nim: e.target.value.replace(/\D/g, '') })} className="input" />
          <input placeholder="Nama lengkap" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input" />
          <input placeholder="Angkatan (mis. 2023, opsional)" inputMode="numeric" maxLength={4} value={form.angkatan} onChange={(e) => setForm({ ...form, angkatan: e.target.value.replace(/\D/g, '') })} className="input" />
          <select aria-label="Divisi" value={form.divisi} onChange={(e) => setForm({ ...form, divisi: e.target.value })} className="input">
            <option value="">Divisi (opsional)</option>
            {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <input placeholder="Kode (mis. ZIKRI)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} maxLength={10} className="input font-mono" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="input" disabled={!isSuperAdmin}>
            {(isSuperAdmin ? (['staff', 'admin', 'super_admin'] as Role[]) : (['staff'] as Role[])).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <button
            disabled={pending}
            className="btn-primary sm:col-span-2"
            onClick={() =>
              run(() => createAccount(form), (r) => {
                setReveal({ who: `${form.fullName} (${form.code})`, label: secretName(form.role), secret: r.secret! })
                setForm(EMPTY_FORM)
                setPanel(null)
                toast.success('Akun dibuat')
              })
            }
          >
            Buat akun
          </button>
        </div>
      )}

      {editing && (
        <div className="card-surface grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr_auto_auto]">
          <input aria-label="Nama" value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} className="input" />
          <input aria-label="Kode" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '') })} maxLength={10} className="input font-mono" />
          <input aria-label="Angkatan" placeholder="Angkatan" inputMode="numeric" maxLength={4} value={editing.angkatan} onChange={(e) => setEditing({ ...editing, angkatan: e.target.value.replace(/\D/g, '') })} className="input" />
          <select aria-label="Divisi" value={editing.divisi} onChange={(e) => setEditing({ ...editing, divisi: e.target.value })} className="input">
            <option value="">Tanpa divisi</option>
            {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button disabled={pending} className="btn-primary" onClick={() => run(() => updateAccount(editing.id, editing), () => { setEditing(null); toast.success('Tersimpan') })}>
            Simpan
          </button>
          <button className="btn-secondary" onClick={() => setEditing(null)}>Batal</button>
        </div>
      )}

      <div className="card-surface divide-y divide-gray-100">
        {filtered.map((u) => (
          <div key={u.id} className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${u.is_active ? '' : 'opacity-50'}`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">
                {u.full_name} <span className="font-mono text-xs tracking-wider text-gray-400">{u.code}</span>
              </p>
              <p className="text-sm text-gray-500">
                {u.nim} · {ROLE_LABEL[u.role]}
                {u.divisi && ` · ${u.divisi}`}
                {u.angkatan && ` · Angkatan ${u.angkatan}`}
                {!u.is_active && ' · Nonaktif'}
                {u.is_active && u.must_change_secret && ' · Belum ganti rahasia'}
              </p>
            </div>
            {canManage(u) && u.id !== meId && (
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setEditing({ id: u.id, fullName: u.full_name, code: u.code, angkatan: u.angkatan ? String(u.angkatan) : '', divisi: u.divisi ?? '' })}>Edit</button>
                <button
                  disabled={pending}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() =>
                    confirm(`Reset ${secretName(u.role)} ${u.full_name}?`) &&
                    run(() => resetSecret(u.id), (r) => setReveal({ who: `${u.full_name} (${u.code})`, label: secretName(u.role), secret: r.secret! }))
                  }
                >
                  Reset {secretName(u.role)}
                </button>
                {isSuperAdmin && (
                  <select
                    value={u.role}
                    disabled={pending}
                    onChange={(e) => {
                      const role = e.target.value as Role
                      if (!confirm(`Ubah role ${u.full_name} jadi ${ROLE_LABEL[role]}? ${secretName(role)} sementara baru akan dibuat.`)) return
                      run(() => setRole(u.id, role), (r) => setReveal({ who: `${u.full_name} (${u.code})`, label: secretName(role), secret: r.secret! }))
                    }}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs"
                  >
                    {(['staff', 'admin', 'super_admin'] as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                )}
                <button
                  disabled={pending}
                  className={`btn px-3 py-1.5 text-xs ${u.is_active ? 'border border-red-200 bg-white text-red-600 hover:bg-red-50' : 'btn-primary'}`}
                  onClick={() =>
                    (!u.is_active || confirm(`Nonaktifkan ${u.full_name}? Dia tidak bisa login lagi.`)) &&
                    run(() => setActive(u.id, !u.is_active), () => toast.success(u.is_active ? 'Akun dinonaktifkan' : 'Akun diaktifkan'))
                  }
                >
                  {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-gray-400">Tidak ada akun.</p>}
      </div>
    </div>
  )
}
