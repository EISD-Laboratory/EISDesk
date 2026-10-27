import type { Database } from '@/lib/database.types'

export type SessionCategory = Database['public']['Enums']['session_category']
export type SessionStatus = Database['public']['Enums']['session_status']

export const CATEGORY_LABEL: Record<SessionCategory, string> = {
  belajar: 'Belajar',
  radiv: 'Rapat Divisi',
  rapat: 'Rapat',
  kegiatan: 'Kegiatan Lab',
  lainnya: 'Lainnya',
}

// Strip gradien identitas kartu (pola "card with top gradient bar" WEB-EISD)
export const CATEGORY_GRADIENT: Record<SessionCategory, string> = {
  belajar: 'from-primary to-primary-light',
  radiv: 'from-accent-green to-emerald-400',
  rapat: 'from-primary to-accent-green',
  kegiatan: 'from-amber-400 to-orange-400',
  lainnya: 'from-gray-300 to-gray-400',
}

export const CATEGORY_CHIP: Record<SessionCategory, string> = {
  belajar: 'bg-primary/10 text-primary border-primary/20',
  radiv: 'bg-accent-green/10 text-emerald-700 border-accent-green/30',
  rapat: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  kegiatan: 'bg-amber-50 text-amber-700 border-amber-200',
  lainnya: 'bg-gray-50 text-gray-600 border-gray-200',
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: 'Terjadwal',
  open: 'Terbuka',
  closed: 'Selesai',
  cancelled: 'Dibatalkan',
  merged: 'Digabung',
}

export const STATUS_CHIP: Record<SessionStatus, string> = {
  scheduled: 'bg-primary/10 text-primary border-primary/20',
  open: 'bg-accent-green/15 text-emerald-700 border-accent-green/30',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  merged: 'bg-gray-100 text-gray-500 border-gray-200',
}

export const ROLE_LABEL = {
  staff: 'Staff',
  admin: 'Admin',
  super_admin: 'Super Admin',
} as const

// Divisi lab (tetap). Disimpan apa adanya; dicek juga oleh constraint profiles.divisi.
export const DIVISIONS = ['Competition', 'Content', 'Enabler', 'Event', 'Practicum', 'Research & Community', 'Study Group'] as const
export type Division = (typeof DIVISIONS)[number]
