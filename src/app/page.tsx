'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import HeroSearch from '@/components/ui/HeroSearch'
import FilterBar from '@/components/ui/FilterBar'
import EventGrid from '@/components/ui/EventGrid'
import RegionSwitcher from '@/components/ui/RegionSwitcher'
import SetupBanner from '@/components/ui/SetupBanner'
import type { EventCardData } from '@/components/ui/EventCard'
import type { AgeRange } from '@/lib/types'
import type { DateFilter } from '@/components/ui/FilterBar'
import type { EventsApiResponse } from '@/lib/types'
import { useRegion } from '@/context/RegionContext'

export default function HomePage() {
  const router = useRouter()
  const { region, regionKey } = useRegion()
  const prevRegionKey = useRef<string>(regionKey)
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeAgeRange, setActiveAgeRange] = useState<AgeRange | 'All'>('All')
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [events, setEvents] = useState<EventCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [setupMessages, setSetupMessages] = useState<string[]>([])
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset filters when region changes
  useEffect(() => {
    if (prevRegionKey.current !== regionKey) {
      prevRegionKey.current = regionKey
      setActiveCategory('All')
      setActiveAgeRange('All')
      setActiveDateFilter('all')
      setSearchQuery('')
      setDebouncedQuery('')
    }
  }, [regionKey])

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
    setError(false)
    try {
      const params = new URLSearchParams({
        lat: String(region.lat),
        lng: String(region.lng),
        radius: String(region.radius),
        region: regionKey,
        ...(activeCategory !== 'All' && { category: activeCategory }),
        ...(activeAgeRange !== 'All' && { ageRange: activeAgeRange }),
        ...(activeDateFilter !== 'all' && { dateFilter: activeDateFilter }),
        ...(debouncedQuery.trim() && { q: debouncedQuery.trim() }),
      })

      const res = await fetch(`/api/events?${params}`)
      if (!res.ok) throw new Error('Failed to fetch events')

      const data: EventsApiResponse = await res.json()
      setEvents(data.events as EventCardData[])
      setError(false)

      // Collect setup messages
      if (data.requiresSetup && data.setupMessage) {
        setSetupMessages(data.setupMessage.split(' | ').filter(Boolean))
      } else {
        setSetupMessages([])
      }
    } catch (err) {
      console.error('[HomePage] Failed to fetch events:', err)
      setEvents([])
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [region, regionKey, activeCategory, activeAgeRange, activeDateFilter, debouncedQuery])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  function handleEventClick(id: string) {
    router.push(`/events/${id}`)
  }

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="filter-announcer"
      >
        {!loading && `${events.length} events found${activeCategory !== 'All' ? ` in ${activeCategory}` : ''}${debouncedQuery ? ` for "${debouncedQuery}"` : ''}`}
      </div>

      {/* Hero + Search */}
      <HeroSearch
        location={region.label}
        onSearchChange={setSearchQuery}
        locationSlot={<RegionSwitcher />}
      />

      {/* Category + Date + Age Range filter bar â€" sticky */}
      <FilterBar key={regionKey}
        onCategoryChange={setActiveCategory}
        onAgeRangeChange={setActiveAgeRange}
        onDateFilterChange={setActiveDateFilter}
      />

      {/* Error banner */}
      {error && !loading && (
        <div className="mx-4 my-3 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-[14px] font-medium text-red-700">Couldn&apos;t load events</p>
            <p className="text-[13px] text-red-600">Check your connection and try again.</p>
          </div>
          <button
            onClick={fetchEvents}
            className="ml-auto text-[13px] font-medium text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Setup banners â€" shown when APIs need configuration */}
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
          regionKey={regionKey}
          onResetFilters={() => {
            setActiveCategory('All')
            setActiveAgeRange('All')
            setActiveDateFilter('all')
            setSearchQuery('')
            setDebouncedQuery('')
          }}
          onEventClick={handleEventClick}
        />
      </section>
    </div>
  )
}

