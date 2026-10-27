import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import BackToTop from '@/components/BackToTop'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'EISDesk', template: '%s · EISDesk' },
  description: 'Jadwal dan sesi pemakaian Lab EISD',
  icons: { icon: '/images/logo.png' },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-6">{children}</main>
        <Footer />
        <BackToTop />
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
