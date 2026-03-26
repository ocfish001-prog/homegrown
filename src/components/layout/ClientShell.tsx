'use client'

import { usePathname } from 'next/navigation'
import { RegionProvider } from '@/context/RegionContext'
import SideNavWithRegion from '@/components/layout/SideNavWithRegion'

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <RegionProvider>
      <div className="flex min-h-screen w-full">
        {/* Desktop side nav */}
        <SideNavWithRegion />

        {/* Main content area — offset by side nav on desktop */}
        <main
          id="main-content"
          className="flex-1 min-w-0 md:ml-56 min-h-screen overflow-x-hidden"
          tabIndex={-1}
        >
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </RegionProvider>
  )
}
