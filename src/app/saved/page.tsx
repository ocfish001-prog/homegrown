'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import EmptyState from '@/components/ui/EmptyState'
import EventCard, { type EventCardData } from '@/components/ui/EventCard'
import { SkeletonGrid } from '@/components/ui/SkeletonCard'
import { useSavedEvents } from '@/hooks/useSavedEvents'
import { useRegion } from '@/context/RegionContext'
import type { EventsApiResponse } from '@/lib/types'

export default function SavedPage() {
  const router = useRouter()
  const { region, regionKey } = useRegion()
  const { savedIds, toggleSaved, hydrated } = useSavedEvents()
  const [events, setEvents] = useState<EventCardData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSavedEvents = useCallback(async () => {
    if (!hydrated) return
    const ids = Array.from(savedIds)

    if (ids.length === 0) {
      setEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Fetch all events for the current region, then filter to saved IDs
      // This is the most reliable approach given our current API structure
      const params = new URLSearchParams({
        lat: String(region.lat),
        lng: String(region.lng),
        radius: '50', // broad radius to catch more events
        region: regionKey,
      })

      const res = await fetch(`/api/events?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data: EventsApiResponse = await res.json()
      const savedSet = new Set(ids)
      const filtered = (data.events as EventCardData[]).filter((e) =>
        savedSet.has(e.id)
      )
      setEvents(filtered)
    } catch (err) {
      console.error('[SavedPage] Failed to fetch events:', err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [hydrated, savedIds, region, regionKey])

  useEffect(() => {
    fetchSavedEvents()
  }, [fetchSavedEvents])

  const handleUnsave = (id: string, saved: boolean) => {
    toggleSaved(id, saved)
    if (!saved) {
      // Remove from local display immediately
      setEvents((prev) => prev.filter((e) => e.id !== id))
    }
  }

  const handleEventClick = (id: string) => {
    router.push(`/events/${id}`)
  }

  if (!hydrated || loading) {
    return (
      <div className="flex flex-col min-h-screen px-4 py-6 mb-nav md:mb-0">
        <h1 className="text-[20px] font-semibold text-bark mb-6">Saved Events</h1>
        <SkeletonGrid count={4} />
      </div>
    )
  }

  if (savedIds.size === 0 || events.length === 0) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center mb-nav md:mb-0">
        <EmptyState
          icon="🤍"
          headline="No saved events yet"
          body="Tap ❤️ on any event to save it here. Build your schedule as you browse."
          primaryAction={{
            label: 'Browse Events',
            onClick: () => router.push('/'),
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-6 mb-nav md:mb-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-semibold text-bark">Saved Events</h1>
        <span className="text-[13px] text-warm-gray-dark">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
        {events.map((event, i) => (
          <EventCard
            key={event.id}
            event={{ ...event, isSaved: true }}
            onSave={handleUnsave}
            onClick={handleEventClick}
            style={{ animationDelay: `${i * 60}ms` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}
