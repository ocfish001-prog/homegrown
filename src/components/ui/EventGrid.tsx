'use client'

import { useMemo, useState, useEffect } from 'react'
import EventCard, { type EventCardData } from './EventCard'
import { SkeletonGrid } from './SkeletonCard'
import EmptyState from './EmptyState'
import { cn } from '@/lib/utils'
import { useSavedEvents } from '@/hooks/useSavedEvents'

const PAGE_SIZE = 24

interface EventGridProps {
  events: EventCardData[]
  loading?: boolean
  category?: string
  searchQuery?: string
  regionKey?: string
  onResetFilters?: () => void
  onEventClick?: (id: string) => void
  className?: string
}

export default function EventGrid({
  events,
  loading = false,
  category = 'All',
  searchQuery = '',
  regionKey = 'hawaii',
  onResetFilters,
  onEventClick,
  className,
}: EventGridProps) {
  const { isSaved, toggleSaved, hydrated } = useSavedEvents()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Reset pagination when events list changes (e.g. filter/region change)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [events])

  // Sort saved events to the top, preserving relative order within each group
  const sortedEvents = useMemo(() => {
    if (!hydrated) return events
    const saved = events.filter((e) => isSaved(e.id))
    const unsaved = events.filter((e) => !isSaved(e.id))
    return [...saved, ...unsaved]
  }, [events, isSaved, hydrated])

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

    // Region-specific empty state
    if (category === 'All' && regionKey === 'sfbay') {
      return (
        <EmptyState
          icon="🌉"
          headline="Loading SF Bay Events…"
          body="We're pulling in events from parks, libraries, and family venues across the Bay Area. If this keeps showing, try refreshing."
          primaryAction={{
            label: 'Refresh',
            onClick: () => {
              onResetFilters?.()
              window.location.reload()
            },
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
            ? 'Try expanding your radius or check back soon for new events.'
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

  const visibleEvents = sortedEvents.slice(0, visibleCount)
  const hasMore = visibleCount < sortedEvents.length

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div
        className={cn(
          'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
          'gap-2 md:gap-4',
        )}
      >
        {visibleEvents.map((event, i) => (
          <EventCard
            key={event.id}
            event={{ ...event, isSaved: isSaved(event.id) }}
            onSave={toggleSaved}
            onClick={onEventClick}
            style={{ animationDelay: `${i * 60}ms` } as React.CSSProperties}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-6 py-2.5 rounded-full bg-sage text-white text-[14px] font-medium hover:bg-sage-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
