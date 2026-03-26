'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeroSearchProps {
  location?: string
  onLocationClick?: () => void
  onSearchChange?: (value: string) => void
  locationSlot?: React.ReactNode
  className?: string
}

export default function HeroSearch({
  location = 'SF Bay Area',
  onLocationClick,
  onSearchChange,
  locationSlot,
  className,
}: HeroSearchProps) {
  return (
    <div className={cn('px-lg pt-xl pb-md space-y-3', className)}>
      {/* Location chip — uses locationSlot if provided, else simple button */}
      {locationSlot ?? (
        <button
          type="button"
          onClick={onLocationClick}
          className={cn(
            'inline-flex items-center gap-1.5',
            'px-3 py-1.5 rounded-full',
            'bg-sage/15 text-bark',
            'text-[13px] font-medium',
            'border border-sage/30',
            'transition-all duration-150',
            'hover:bg-sage/25 hover:border-sage/50',
            'active:scale-[0.97]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
          )}
          aria-label={`Current location: ${location}. Tap to change.`}
        >
          <span>{location}</span>
        </button>
      )}

      {/* Page heading */}
      <h1 className="font-serif text-h2 font-normal text-bark leading-tight">
        Events near you
      </h1>

      {/* Search bar */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray-dark pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search events, classes, co-ops..."
          onChange={(e) => onSearchChange?.(e.target.value)}
          className={cn(
            'w-full h-12 pl-11 pr-4',
            'bg-white rounded-full',
            'text-body text-bark placeholder:text-warm-gray-dark',
            'border border-warm-gray/50',
            'shadow-search',
            'transition-all duration-150',
            'hover:border-sage/50',
            'focus:outline-none focus:border-sage focus:shadow-[0_0_0_3px_rgba(145,154,132,0.15)]'
          )}
          aria-label="Search events"
        />
      </div>
    </div>
  )
}
