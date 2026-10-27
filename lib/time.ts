import { TZDate } from '@date-fns/tz'
import { addDays, format, startOfWeek } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

export const TZ = 'Asia/Jakarta'

export const toWib = (d: Date | string | number) => new TZDate(new Date(d), TZ)

export const fmt = (d: Date | string | number, pattern: string) => format(toWib(d), pattern, { locale: localeId })

export const fmtTime = (d: Date | string | number) => fmt(d, 'HH:mm')
export const fmtDate = (d: Date | string | number) => fmt(d, 'EEEE, d MMMM yyyy')
export const fmtRange = (start: string, end: string) => `${fmt(start, 'EEE d MMM, HH:mm')}–${fmtTime(end)}`

// "2026-11-02" + 13 -> ISO timestamptz WIB
export const wibIso = (date: string, hour: number) => `${date}T${String(hour).padStart(2, '0')}:00:00+07:00`

export const todayWib = () => fmt(Date.now(), 'yyyy-MM-dd')
export const nowHourWib = () => toWib(Date.now()).getHours()

// Senin minggu ini (WIB) dalam format yyyy-MM-dd, digeser `offset` minggu
export function weekStart(date: string, offset = 0) {
  const base = new TZDate(`${date}T12:00:00`, TZ)
  return format(addDays(startOfWeek(base, { weekStartsOn: 1 }), offset * 7), 'yyyy-MM-dd')
}

export function addDaysStr(date: string, n: number) {
  return format(addDays(new TZDate(`${date}T12:00:00`, TZ), n), 'yyyy-MM-dd')
}

export const isDateStr = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
