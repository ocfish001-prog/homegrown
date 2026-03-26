import type { Metadata, Viewport } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/ui/BottomNav'
import SideNav from '@/components/ui/SideNav'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Homegrown',
  description: 'Local enrichment for homeschool families on the Big Island, Hawaii',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Homegrown',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#919A84',
  width: 'device-width',
  initialScale: 1,
  // NOTE: maximumScale intentionally omitted — WCAG 1.4.4 requires users can zoom to 200%
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-screen bg-cream font-sans antialiased">
        {/* Skip to main content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-bark focus:text-cream focus:px-4 focus:py-2 focus:rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          Skip to main content
        </a>

        {/* Layout: side nav on desktop, bottom nav on mobile */}
        <div className="flex min-h-screen w-full">
          {/* Desktop side nav */}
          <SideNav location="Big Island, Hawaii" />

          {/* Main content area — offset by side nav on desktop */}
          <main
            id="main-content"
            className="flex-1 min-w-0 md:ml-56 min-h-screen overflow-x-hidden"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />
      </body>
    </html>
  )
}
