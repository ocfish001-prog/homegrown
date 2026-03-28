'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useRef } from 'react'
import { LayoutGrid, Map as MapIcon } from 'lucide-react'
import HeroSearch from '@/components/ui/HeroSearch'
import FilterBar from '@/components/ui/FilterBar'
import EventGrid from '@/components/ui/EventGrid'
import RegionSwitcher from '@/components/ui/RegionSwitcher'
import SetupBanner from '@/components/ui/SetupBanner'
import EventDetailModal from '@/components/ui/EventDetailModal'
import type { EventCardData } from '@/components/ui/EventCard'
import type { AgeRange } from '@/lib/types'
import type { DateFilter } from '@/components/ui/FilterBar'
import type { EventsApiResponse } from '@/lib/types'
import { useRegion } from '@/context/RegionContext'
import { cn } from '@/lib/utils'

const MapView = dynamic(() => import('@/components/ui/MapView'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-warm-gray/40 bg-white min-h-[400px] md:min-h-[500px] flex items-center justify-center shadow-card">
      <span className="text-warm-gray-dark text-[14px]">Loading map…</span>
    </div>
  ),
})

export default function HomePage() {
  const { region, regionKey } = useRegion()
  const [selectedEvent, setSelectedEvent] = useState<EventCardData | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards')

  // Filters — controlled state
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeAgeRange, setActiveAgeRange] = useState<AgeRange | 'All'>('All')
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Data state
  const [events, setEvents] = useState<EventCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [setupMessages, setSetupMessages] = useState<string[]>([])

  // Refs for debounce
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track previous region to detect changes and reset filters
  const prevRegionKeyRef = useRef<string>(regionKey)

  // Reset filters synchronously when region changes
  // This runs before the fetch effect sees the new regionKey
  if (prevRegionKeyRef.current !== regionKey) {
    prevRegionKeyRef.current = regionKey
    setActiveCategory('All')
    setActiveAgeRange('All')
    setActiveDateFilter('all')
    setSearchQuery('')
    setDebouncedQuery('')
  }

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

  // Fetch events — fires whenever any filter or region changes
  useEffect(() => {
    const controller = new AbortController()

    const fetchEvents = async () => {
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

        const res = await fetch(`/api/events?${params}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('Failed to fetch events')

        const data: EventsApiResponse = await res.json()
        setEvents(data.events as EventCardData[])
        setError(false)

        if (data.requiresSetup && data.setupMessage) {
          setSetupMessages(data.setupMessage.split(' | ').filter(Boolean))
        } else {
          setSetupMessages([])
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('[HomePage] Failed to fetch events:', err)
        setEvents([])
        setError(true)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchEvents()

    return () => {
      controller.abort()
    }
  }, [region, regionKey, activeCategory, activeAgeRange, activeDateFilter, debouncedQuery])

  function handleEventClick(id: string) {
    const ev = events.find((e) => e.id === id) ?? null
    setSelectedEvent(ev)
  }

  function resetFilters() {
    setActiveCategory('All')
    setActiveAgeRange('All')
    setActiveDateFilter('all')
    setSearchQuery('')
    setDebouncedQuery('')
  }

  const mapZoom = region.radius >= 80 ? 9 : 10

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="filter-announcer"
      >
        {!loading && `${events.length} events found${activeCategory !== 'All' ? ` in ${activeCategory}` : ''}${debouncedQuery ? ` for "${debouncedQuery}"` : ''}`}
      </div>

      <HeroSearch
        location={region.label}
        value={searchQuery}
        onSearchChange={setSearchQuery}
        locationSlot={<RegionSwitcher />}
      />

      <FilterBar
        key={regionKey}
        onCategoryChange={setActiveCategory}
        onAgeRangeChange={setActiveAgeRange}
        onDateFilterChange={setActiveDateFilter}
      />

      {error && !loading && (
        <div className="mx-4 my-3 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-[14px] font-medium text-red-700">Couldn&apos;t load events</p>
            <p className="text-[13px] text-red-600">Check your connection and try again.</p>
          </div>
          <button
            onClick={() => {
              setError(false)
              setLoading(true)
              window.location.reload()
            }}
            className="ml-auto text-[13px] font-medium text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {setupMessages.length > 0 && !loading && events.length === 0 && (
        <div className="px-lg pt-3 space-y-2">
          {setupMessages.map((msg, i) => (
            <SetupBanner key={i} message={msg} />
          ))}
        </div>
      )}

      <section className="px-lg py-xl flex-1 mb-nav md:mb-0" aria-label="Events">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
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

          <div
            className="inline-flex items-center rounded-full border border-sage/20 bg-white p-1 shadow-sm"
            role="tablist"
            aria-label="Choose event layout"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'cards'}
              onClick={() => setViewMode('cards')}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium transition-colors',
                viewMode === 'cards'
                  ? 'bg-sage text-white shadow-sm'
                  : 'text-bark hover:bg-cream'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'map'}
              onClick={() => setViewMode('map')}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium transition-colors',
                viewMode === 'map'
                  ? 'bg-sage text-white shadow-sm'
                  : 'text-bark hover:bg-cream'
              )}
            >
              <MapIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <MapView
            events={events}
            center={[region.lat, region.lng]}
            zoom={mapZoom}
            onEventClick={handleEventClick}
          />
        ) : (
          <EventGrid
            events={events}
            loading={loading}
            category={activeCategory}
            searchQuery={debouncedQuery}
            regionKey={regionKey}
            onResetFilters={resetFilters}
            onEventClick={handleEventClick}
          />
        )}
      </section>
    </div>
  )
}
