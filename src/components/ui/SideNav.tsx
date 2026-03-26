'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Calendar, Bookmark, MapPin, ChevronDown, Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home, comingSoon: false },
  { href: '/discover', label: 'Discover', icon: Compass, comingSoon: true },
  { href: '/calendar', label: 'Calendar', icon: Calendar, comingSoon: true },
  { href: '/saved', label: 'Saved', icon: Bookmark, comingSoon: false },
]

interface SideNavProps {
  location?: string
  onLocationClick?: () => void
}

export default function SideNav({ location = 'Big Island, Hawaii', onLocationClick }: SideNavProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col',
        'w-56 shrink-0',
        'fixed left-0 top-0 h-full z-40',
        'bg-cream border-r border-warm-gray/40',
        'px-lg py-xl'
      )}
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <Link
        href="/"
        className={cn(
          'flex items-center gap-2 mb-8',
          'text-bark font-semibold text-lg',
          'hover:text-sage transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded'
        )}
        aria-label="Homegrown — go to homepage"
      >
        <Leaf className="w-6 h-6 text-sage" aria-hidden="true" />
        <span className="font-serif text-h3">Homegrown</span>
      </Link>

      {/* Location picker */}
      <button
        type="button"
        onClick={onLocationClick}
        className={cn(
          'flex items-center gap-2 mb-6',
          'px-3 py-2 rounded-xl',
          'bg-sage/10 text-bark',
          'text-[13px] font-medium',
          'border border-sage/20',
          'transition-all duration-150',
          'hover:bg-sage/20 hover:border-sage/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage',
          'w-full text-left'
        )}
        aria-label={`Current location: ${location}. Click to change.`}
      >
        <MapPin className="w-3.5 h-3.5 text-sage shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">{location}</span>
        <ChevronDown className="w-3.5 h-3.5 text-sage/70 shrink-0" aria-hidden="true" />
      </button>

      {/* Nav items */}
      <nav aria-label="Main navigation" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, comingSoon }) => {
          const isActive = pathname === href

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                'text-[15px] font-medium',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage',
                comingSoon
                  ? 'text-warm-gray/60 hover:bg-warm-gray/5 hover:text-warm-gray-dark'
                  : isActive
                  ? 'bg-sage text-white'
                  : 'text-bark/70 hover:bg-sage/10 hover:text-bark'
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={comingSoon ? `${label} (coming soon)` : label}
            >
              <Icon
                className={cn(
                  'w-[18px] h-[18px] shrink-0',
                  comingSoon
                    ? 'stroke-warm-gray/60'
                    : isActive
                    ? 'stroke-white'
                    : 'stroke-current'
                )}
                aria-hidden="true"
              />
              <span className="flex-1">{label}</span>
              {comingSoon && (
                <span className="text-[10px] font-normal text-warm-gray/50 shrink-0">
                  soon
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer note */}
      <p className="text-[11px] text-warm-gray-dark leading-relaxed">
        Enrichment for homeschool families on the Big Island, Hawaii
      </p>
    </aside>
  )
}
