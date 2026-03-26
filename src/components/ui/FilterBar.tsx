'use client'

import { useState } from 'react'
import CategoryPill from './CategoryPill'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/events'
import type { AgeRange } from '@/lib/types'
import { AGE_RANGE_LABELS } from '@/lib/types'

export type DateFilter = 'all' | 'today' | 'weekend' | 'week' | 'month'

interface FilterBarProps {
  onCategoryChange?: (category: string) => void
  onAgeRangeChange?: (ageRange: AgeRange | 'All') => void
  onDateFilterChange?: (filter: DateFilter) => void
  className?: string
}

const AGE_RANGE_OPTIONS: Array<{ value: AgeRange | 'All'; label: string }> = [
  { value: 'All', label: 'All Ages' },
  { value: 'young_kids', label: AGE_RANGE_LABELS.young_kids },
  { value: 'older_kids', label: AGE_RANGE_LABELS.older_kids },
  { value: 'family', label: AGE_RANGE_LABELS.family },
]

const DATE_FILTER_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'all', label: '📅 All Dates' },
  { value: 'today', label: '🌅 Today' },
  { value: 'weekend', label: '🎉 This Weekend' },
  { value: 'week', label: '📆 This Week' },
  { value: 'month', label: '🗓️ This Month' },
]

export default function FilterBar({ onCategoryChange, onAgeRangeChange, onDateFilterChange, className }: FilterBarProps) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeAgeRange, setActiveAgeRange] = useState<AgeRange | 'All'>('All')
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>('all')

  const handleCategorySelect = (cat: string) => {
    setActiveCategory(cat)
    onCategoryChange?.(cat)
  }

  const handleAgeRangeSelect = (ar: AgeRange | 'All') => {
    setActiveAgeRange(ar)
    onAgeRangeChange?.(ar)
  }

  const handleDateFilterSelect = (df: DateFilter) => {
    setActiveDateFilter(df)
    onDateFilterChange?.(df)
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-40 bg-cream/95 backdrop-blur-sm',
        'border-b border-warm-gray/30',
        'relative will-change-transform',
        className
      )}
    >
      {/* Right-edge fade to signal more pills */}
      <div
        className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-cream/95 to-transparent z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Category filter row */}
      <div
        className="flex items-center gap-2 px-lg py-3 overflow-x-auto scrollbar-hide"
        role="group"
        aria-label="Filter by category"
      >
        {CATEGORIES.map((cat) => (
          <CategoryPill
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onSelect={() => handleCategorySelect(cat)}
            onDismiss={activeCategory === cat && cat !== 'All' ? () => handleCategorySelect('All') : undefined}
          />
        ))}
      </div>

      {/* Date filter row */}
      <div
        className="flex items-center gap-2 px-lg pb-2 overflow-x-auto scrollbar-hide"
        role="group"
        aria-label="Filter by date"
      >
        {DATE_FILTER_OPTIONS.map(({ value, label }) => (
          <CategoryPill
            key={value}
            label={label}
            active={activeDateFilter === value}
            onSelect={() => handleDateFilterSelect(value)}
            onDismiss={activeDateFilter === value && value !== 'all' ? () => handleDateFilterSelect('all') : undefined}
          />
        ))}
      </div>

      {/* Age range filter row */}
      <div
        className="flex items-center gap-2 px-lg pb-2 overflow-x-auto scrollbar-hide"
        role="group"
        aria-label="Filter by age range"
      >
        {AGE_RANGE_OPTIONS.map(({ value, label }) => (
          <CategoryPill
            key={value}
            label={label}
            active={activeAgeRange === value}
            onSelect={() => handleAgeRangeSelect(value)}
            onDismiss={activeAgeRange === value && value !== 'All' ? () => handleAgeRangeSelect('All') : undefined}
          />
        ))}
      </div>
    </div>
  )
}
