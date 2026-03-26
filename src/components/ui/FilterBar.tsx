'use client'

import { useState } from 'react'
import CategoryPill from './CategoryPill'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/events'

interface FilterBarProps {
  onCategoryChange?: (category: string) => void
  className?: string
}

export default function FilterBar({ onCategoryChange, className }: FilterBarProps) {
  const [active, setActive] = useState('All')

  const handleSelect = (cat: string) => {
    setActive(cat)
    onCategoryChange?.(cat)
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-40 bg-cream/95 backdrop-blur-sm',
        'border-b border-warm-gray/30',
        'relative',
        className
      )}
    >
      {/* Right-edge fade to signal more pills */}
      <div
        className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-cream/95 to-transparent z-10 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="flex items-center gap-2 px-lg py-3 overflow-x-auto scrollbar-hide"
        role="group"
        aria-label="Filter by category"
      >
        {CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            label={cat}
            active={active === cat}
            onSelect={() => handleSelect(cat)}
            onDismiss={active === cat && cat !== 'All' ? () => handleSelect('All') : undefined}
          />
        ))}
      </div>
    </div>
  )
}
