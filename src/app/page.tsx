'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import HeroSearch from '@/components/ui/HeroSearch'
import FilterBar from '@/components/ui/FilterBar'
import EventGrid from '@/components/ui/EventGrid'
import LocationPicker from '@/components/ui/LocationPicker'
import SetupBanner from '@/components/ui/SetupBanner'
import type { EventCardData } from '@/components/ui/EventCard'
import type { LocationState } from '@/lib/types'
import { DEFAULT_LOCATION } from '@/lib/types'
import type { EventsApiResponse } from '@/lib/types'

export default function HomePage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [location, setLocation] = useState<LocationState>(DEFAULT_LOCATION)
  const [events, setEvents] = useState<EventCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [setupMessages, setSetupMessages] = useState<string[]>([])
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 350)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [searchQuery])

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        lat: String(location.lat),
        lng: String(location.lng),
        radius: String(location.radius),
        ...(activeCategory !== 'All' && { category: activeCategory }),
        ...(debouncedQuery.trim() && { q: debouncedQuery.trim() }),
      })

      const res = await fetch(`/api/events?${params}`)
      if (!res.ok) throw new Error('Failed to fetch events')

      const data: EventsApiResponse = await res.json()
      setEvents(data.events as EventCardData[])

      // Collect setup messages
      if (data.requiresSetup && data.setupMessage) {
        setSetupMessages(data.setupMessage.split(' | ').filter(Boolean))
      } else {
        setSetupMessages([])
      }
    } catch (err) {
      console.error('[HomePage] Failed to fetch events:', err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [location, activeCategory, debouncedQuery])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  function handleEventClick(id: string) {
    router.push(`/events/${id}`)
  }

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      {/* Hero + Search */}
      <HeroSearch
        location={location.label}
        onSearchChange={setSearchQuery}
        locationSlot={
          <LocationPicker
            location={location}
            onLocationChange={setLocation}
          />
        }
      />

      {/* Category filter bar — sticky */}
      <FilterBar onCategoryChange={setActiveCategory} />

      {/* Setup banners — shown when APIs need configuration */}
      {setupMessages.length > 0 && !loading && events.length === 0 && (
        <div className="px-lg pt-3 space-y-2">
          {setupMessages.map((msg, i) => (
            <SetupBanner key={i} message={msg} />
          ))}
        </div>
      )}

      {/* Event grid */}
      <section className="px-lg py-xl flex-1 mb-nav md:mb-0" aria-label="Events">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-semibold text-bark">
            {debouncedQuery
              ? `Results for "${debouncedQuery}"`
              : activeCategory === 'All'
              ? 'Events Near You'
              : activeCategory}
          </h2>
          {!loading && events.length > 0 && (
            <span className="text-[13px] text-warm-gray-dark">
              {events.length} {events.length === 1 ? 'result' : 'results'}
            </span>
          )}
        </div>

        <EventGrid
          events={events}
          loading={loading}
          category={activeCategory}
          searchQuery={debouncedQuery}
          onResetFilters={() => {
            setActiveCategory('All')
            setSearchQuery('')
            setDebouncedQuery('')
          }}
          onEventClick={handleEventClick}
        />
      </section>
    </div>
  )
}
