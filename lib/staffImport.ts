// Dipakai bersama oleh form import (browser) dan server action importStaff.

export const IMPORT_MAX_ROWS = 300
export const IMPORT_SHEET = 'Data'

// Urutan kolom template. Header dicocokkan tanpa peduli huruf besar/kecil.
export const IMPORT_COLUMNS = [
  { key: 'fullName', header: 'Nama', width: 32 },
  { key: 'nim', header: 'NIM', width: 16 },
  { key: 'angkatan', header: 'Angkatan', width: 11 },
  { key: 'divisi', header: 'Divisi', width: 22 },
  { key: 'code', header: 'Kode', width: 10 },
] as const

export type ImportRow = { row: number; fullName: string; nim: string; angkatan: string; divisi: string; code: string }
export type ImportResult = {
  errors?: { row: number; message: string }[]
  created?: { row: number; fullName: string; nim: string; code: string; pin: string }[]
  failed?: { row: number; fullName: string; message: string }[]
}
