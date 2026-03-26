'use client'

import { useState } from 'react'
import EventCard, { type EventCardData } from './EventCard'
import { SkeletonGrid } from './SkeletonCard'
import EmptyState from './EmptyState'
import { cn } from '@/lib/utils'

interface EventGridProps {
  events: EventCardData[]
  loading?: boolean
  category?: string
  searchQuery?: string
  onResetFilters?: () => void
  onEventClick?: (id: string) => void
  className?: string
}

export default function EventGrid({
  events,
  loading = false,
  category = 'All',
  searchQuery = '',
  onResetFilters,
  onEventClick,
  className,
}: EventGridProps) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const handleSave = (id: string, saved: boolean) => {
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (saved) next.add(id)
      else next.delete(id)
      return next
    })
  }

  if (loading) {
    return <SkeletonGrid count={6} />
  }

  if (events.length === 0) {
    if (searchQuery) {
      return (
        <EmptyState
          icon="🔍"
          headline={`No results for "${searchQuery}"`}
          body="Try different keywords or browse all categories."
          primaryAction={{
            label: 'Clear Search',
            onClick: () => onResetFilters?.(),
          }}
        />
      )
    }

    return (
      <EmptyState
        icon={category === 'All' ? '🌱' : '🔍'}
        headline={
          category === 'All'
            ? "No events found nearby"
            : `No ${category.toLowerCase()} nearby`
        }
        body={
          category === 'All'
            ? 'Connect Eventbrite to see real local events, or try expanding your radius.'
            : `Try expanding your area or browse all event types.`
        }
        primaryAction={{
          label: 'Browse All Events',
          onClick: () => onResetFilters?.(),
        }}
        secondaryAction={
          category !== 'All'
            ? {
                label: 'Adjust Filters',
                onClick: () => onResetFilters?.(),
              }
            : undefined
        }
      />
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        'gap-2 md:gap-4',
        className
      )}
    >
      {events.map((event, i) => (
        <EventCard
          key={event.id}
          event={{ ...event, isSaved: savedIds.has(event.id) }}
          onSave={handleSave}
          onClick={onEventClick}
          style={{ animationDelay: `${i * 60}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
