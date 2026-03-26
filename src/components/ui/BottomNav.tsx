'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Calendar, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home, comingSoon: false },
  { href: '/discover', label: 'Discover', icon: Compass, comingSoon: true },
  { href: '/calendar', label: 'Calendar', icon: Calendar, comingSoon: true },
  { href: '/saved', label: 'Saved', icon: Bookmark, comingSoon: false },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'md:hidden', // Hide on desktop — side nav takes over
        'bg-white border-t border-warm-gray/50',
        'shadow-overlay',
        // Safe area padding for iOS notch
        'pb-safe'
      )}
      aria-label="Main navigation"
    >
      <div className="flex items-stretch h-[49px]">
        {NAV_ITEMS.map(({ href, label, icon: Icon, comingSoon }) => {
          const isActive = pathname === href

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 relative',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-inset',
                comingSoon
                  ? 'text-warm-gray/60 hover:text-warm-gray-dark'
                  : isActive
                  ? 'text-sage'
                  : 'text-warm-gray-dark hover:text-bark'
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={comingSoon ? `${label} (coming soon)` : label}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-all duration-150',
                    comingSoon
                      ? 'stroke-warm-gray/60 stroke-[1.5]'
                      : isActive
                      ? 'fill-sage/15 stroke-sage stroke-2'
                      : 'stroke-current stroke-[1.5]'
                  )}
                  aria-hidden="true"
                />
                {/* Coming soon dot indicator */}
                {comingSoon && (
                  <span
                    className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-warm-gray/40 border border-white"
                    aria-hidden="true"
                  />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] transition-all duration-150',
                  comingSoon
                    ? 'font-normal text-warm-gray/60'
                    : isActive
                    ? 'font-semibold text-sage'
                    : 'font-normal text-warm-gray-dark'
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
