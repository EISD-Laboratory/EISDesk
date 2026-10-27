'use client'

import { useRef, useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { readSheet } from 'read-excel-file/browser'
import writeXlsxFile, { type Row } from 'write-excel-file/browser'
import { CircleAlert, Download, FileSpreadsheet, Upload, X } from 'lucide-react'
import { IMPORT_COLUMNS, IMPORT_MAX_ROWS, IMPORT_SHEET, type ImportResult, type ImportRow } from '@/lib/staffImport'
import { DIVISIONS } from '@/lib/labels'
import { todayWib } from '@/lib/time'
import { importStaff } from './actions'

const HEADER_STYLE = { fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: '#494CA0' } as const

async function downloadTemplate() {
  const header: Row = IMPORT_COLUMNS.map((c) => ({ value: c.header, ...HEADER_STYLE }))
  // Kolom NIM diformat teks supaya Excel tidak mengubahnya jadi angka/notasi ilmiah
  const blank: Row[] = Array.from({ length: IMPORT_MAX_ROWS }, () =>
    IMPORT_COLUMNS.map((c) => (c.key === 'nim' ? { type: String, value: '', format: '@' } : null)),
  )
  const guide: Row[] = [
    [{ value: 'Cara mengisi', fontWeight: 'bold', fontSize: 14 }],
    ['1. Isi data staff di sheet "Data", satu orang per baris, mulai baris 2. Jangan ubah judul kolom.'],
    ['2. Nama: nama lengkap (wajib).'],
    ['3. NIM: angka saja, 5–20 digit (wajib, tidak boleh sama dengan akun lain).'],
    ['4. Angkatan: tahun masuk, mis. 2023 (boleh kosong).'],
    [`5. Divisi: salah satu dari ${DIVISIONS.join(', ')} (boleh kosong).`],
    ['6. Kode: kode anggota 2–10 huruf, mis. ZIKR (wajib, unik).'],
    [`7. Maksimal ${IMPORT_MAX_ROWS} baris per file. Semua akun dibuat sebagai staff.`],
    ['8. Upload di Admin → Pengguna → Import Excel. Kalau ada baris yang salah, tidak ada akun yang dibuat; perbaiki lalu upload lagi.'],
    [''],
    [{ value: 'Contoh baris', fontWeight: 'bold' }],
    IMPORT_COLUMNS.map((c) => ({ value: c.header, ...HEADER_STYLE })),
    ['Budi Santoso', '1202230001', 2023, 'Research & Community', 'BUDI'],
    [''],
    [{ value: 'Daftar divisi', fontWeight: 'bold' }],
    ...DIVISIONS.map((d) => [d]),
  ]
  await writeXlsxFile([
    { sheet: IMPORT_SHEET, data: [header, ...blank], columns: IMPORT_COLUMNS.map((c) => ({ width: c.width })), stickyRowsCount: 1 },
    { sheet: 'Petunjuk', data: guide, columns: [{ width: 32 }, { width: 16 }, { width: 11 }, { width: 22 }, { width: 10 }] },
  ]).toFile('template-import-staff-eisdesk.xlsx')
}

const cellText = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())

async function parseFile(file: File): Promise<{ rows?: ImportRow[]; error?: string }> {
  let data
  try {
    data = await readSheet(file, IMPORT_SHEET).catch(() => readSheet(file))
  } catch {
    return { error: 'File tidak bisa dibaca. Pakai file .xlsx dari template.' }
  }
  const headers = (data[0] ?? []).map((h) => cellText(h).toLowerCase())
  const index = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.key, headers.indexOf(c.header.toLowerCase())]))
  const missing = IMPORT_COLUMNS.filter((c) => index[c.key] < 0).map((c) => c.header)
  if (missing.length) return { error: `Kolom tidak ditemukan: ${missing.join(', ')}. Pakai template yang disediakan.` }

  const rows: ImportRow[] = []
  data.slice(1).forEach((r, i) => {
    const get = (key: string) => cellText(r[index[key]])
    if (IMPORT_COLUMNS.every((c) => !get(c.key))) return // baris kosong
    rows.push({ row: i + 2, fullName: get('fullName'), nim: get('nim'), angkatan: get('angkatan'), divisi: get('divisi'), code: get('code') })
  })
  if (!rows.length) return { error: 'Sheet "Data" masih kosong.' }
  if (rows.length > IMPORT_MAX_ROWS) return { error: `Maksimal ${IMPORT_MAX_ROWS} baris per import (file berisi ${rows.length}).` }
  return { rows }
}

async function downloadPins(created: NonNullable<ImportResult['created']>) {
  await writeXlsxFile(
    [
      ['Nama', 'NIM', 'Kode', 'PIN sementara'].map((value) => ({ value, ...HEADER_STYLE })),
      ...created.map((c) => [c.fullName, { type: String, value: c.nim }, c.code, { type: String, value: c.pin }]),
    ],
    { columns: [{ width: 32 }, { width: 16 }, { width: 10 }, { width: 16 }] },
  ).toFile(`pin-staff-${todayWib()}.xlsx`)
}

export default function ImportStaff({ onClose }: { onClose: () => void }) {
  const [pending, start] = useTransition()
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function onFile(file: File | undefined) {
    setResult(null)
    setRows(null)
    if (!file) return
    setFileName(file.name)
    const parsed = await parseFile(file)
    if (parsed.error) {
      setResult({ errors: [{ row: 0, message: parsed.error }] })
      if (input.current) input.current.value = ''
    } else setRows(parsed.rows!)
  }

  function submit() {
    if (!rows) return
    start(async () => {
      const res = await importStaff(rows)
      setResult(res)
      if (res.created?.length) {
        setRows(null)
        if (input.current) input.current.value = ''
        toast.success(`${res.created.length} akun staff dibuat`)
      }
    })
  }

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <FileSpreadsheet className="h-5 w-5 text-primary" strokeWidth={1.8} /> Import staff dari Excel
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Unduh template, isi kolom Nama, NIM, Angkatan, Divisi, dan Kode, lalu upload. Semua akun dibuat sebagai staff dengan PIN sementara.
          </p>
        </div>
        <button onClick={onClose} aria-label="Tutup" className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="button" onClick={() => downloadTemplate().catch(() => toast.error('Gagal membuat template'))} className="btn-secondary">
          <Download className="h-4 w-4" strokeWidth={1.8} /> Unduh template
        </button>
        <label className="btn-secondary cursor-pointer">
          <Upload className="h-4 w-4" strokeWidth={1.8} /> {fileName ? 'Ganti file' : 'Pilih file .xlsx'}
          <input
            ref={input}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {fileName && <span className="truncate text-sm text-gray-500">{fileName}</span>}
      </div>

      {rows && (
        <div className="space-y-3">
          <div className="max-h-72 overflow-auto rounded-xl border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2">Baris</th>
                  {IMPORT_COLUMNS.map((c) => <th key={c.key} className="px-3 py-2">{c.header}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.row}>
                    <td className="px-3 py-1.5 text-gray-400">{r.row}</td>
                    <td className="px-3 py-1.5">{r.fullName}</td>
                    <td className="px-3 py-1.5 font-mono">{r.nim}</td>
                    <td className="px-3 py-1.5">{r.angkatan}</td>
                    <td className="px-3 py-1.5">{r.divisi}</td>
                    <td className="px-3 py-1.5 font-mono">{r.code.toUpperCase()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button disabled={pending} onClick={submit} className="btn-primary w-full">
            {pending ? 'Membuat akun…' : `Buat ${rows.length} akun staff`}
          </button>
        </div>
      )}

      {result?.errors && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="mb-2 flex items-center gap-2 font-semibold">
            <CircleAlert className="h-4 w-4" strokeWidth={1.8} /> Belum ada akun yang dibuat. Perbaiki file lalu upload lagi:
          </p>
          <ul className="space-y-1">
            {result.errors.map((e, i) => (
              <li key={i}>{e.row > 0 && <b>Baris {e.row}: </b>}{e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {result?.failed && result.failed.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="mb-2 font-semibold">{result.failed.length} akun gagal dibuat:</p>
          <ul className="space-y-1">
            {result.failed.map((f) => <li key={f.row}><b>Baris {f.row} ({f.fullName}):</b> {f.message}</li>)}
          </ul>
        </div>
      )}

      {result?.created && result.created.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-accent-green/40 bg-accent-green/5 p-4">
          <p className="text-sm text-gray-700">
            <b>{result.created.length} akun staff dibuat.</b> PIN sementara hanya ditampilkan sekali. Unduh daftarnya, bagikan ke
            masing-masing orang secara pribadi, lalu hapus filenya. PIN wajib diganti saat login pertama.
          </p>
          <button onClick={() => downloadPins(result.created!)} className="btn-primary">
            <Download className="h-4 w-4" strokeWidth={1.8} /> Unduh daftar PIN (.xlsx)
          </button>
          <div className="max-h-72 overflow-auto rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                <tr><th className="px-3 py-2">Nama</th><th className="px-3 py-2">NIM</th><th className="px-3 py-2">Kode</th><th className="px-3 py-2">PIN</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.created.map((c) => (
                  <tr key={c.nim}>
                    <td className="px-3 py-1.5">{c.fullName}</td>
                    <td className="px-3 py-1.5 font-mono">{c.nim}</td>
                    <td className="px-3 py-1.5 font-mono">{c.code}</td>
                    <td className="px-3 py-1.5 font-mono font-bold tracking-widest">{c.pin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
