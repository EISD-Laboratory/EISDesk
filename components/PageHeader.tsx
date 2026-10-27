import type { ReactNode } from 'react'

// Pola hero WEB-EISD: badge eyebrow (glass + titik hijau) -> judul dua warna -> subjudul
export default function PageHeader({
  eyebrow,
  title,
  highlight,
  subtitle,
  action,
}: {
  eyebrow: string
  title: string
  highlight?: string
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 shadow-soft glass-card shimmer-enhanced">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          {title} {highlight && <span className="text-primary">{highlight}</span>}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500 sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
