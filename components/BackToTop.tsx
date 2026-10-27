'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

// Versi tanpa framer-motion dari WEB-EISD/components/BackToTop.tsx
const R = 18
const CIRC = 2 * Math.PI * R

export default function BackToTop() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? window.scrollY / max : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const visible = progress > 0.2

  return (
    <button
      type="button"
      aria-label="Kembali ke atas"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`group fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-primary active:scale-90 ${
        visible ? 'scale-100 opacity-100' : 'pointer-events-none scale-0 opacity-0'
      }`}
    >
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r={R} stroke="rgba(73, 76, 160, 0.1)" strokeWidth="2" fill="none" />
        <circle
          cx="20"
          cy="20"
          r={R}
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
          className="text-primary transition-colors group-hover:text-white"
        />
      </svg>
      <ArrowUp className="relative z-10 h-5 w-5 animate-bounce-soft text-primary transition-colors group-hover:text-white" strokeWidth={2.5} />
    </button>
  )
}
