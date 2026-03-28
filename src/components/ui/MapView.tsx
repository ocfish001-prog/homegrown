'use client'

import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { EventCardData } from './EventCard'
import { cn } from '@/lib/utils'

// Fix Leaflet default marker icons (broken in Next.js/webpack)
const sageIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface MapViewProps {
  events: EventCardData[]
  center: [number, number]
  zoom: number
  onEventClick?: (id: string) => void
  className?: string
}

/** Re-center map when region changes */
function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const prevCenter = useRef(center)
  const prevZoom = useRef(zoom)

  useEffect(() => {
    if (
      prevCenter.current[0] !== center[0] ||
      prevCenter.current[1] !== center[1] ||
      prevZoom.current !== zoom
    ) {
      map.flyTo(center, zoom, { duration: 0.8 })
      prevCenter.current = center
      prevZoom.current = zoom
    }
  }, [map, center, zoom])

  return null
}

export default function MapView({
  events,
  center,
  zoom,
  onEventClick,
  className,
}: MapViewProps) {
  const mappableEvents = useMemo(
    () => events.filter((e) => typeof e.lat === 'number' && typeof e.lng === 'number'),
    [events]
  )

  // Group events at the same coordinates (same venue)
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, EventCardData[]>()
    for (const ev of mappableEvents) {
      const key = `${ev.lat!.toFixed(4)},${ev.lng!.toFixed(4)}`
      const group = groups.get(key) || []
      group.push(ev)
      groups.set(key, group)
    }
    return groups
  }, [mappableEvents])

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Count indicator */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[13px] text-warm-gray-dark">
          {mappableEvents.length === events.length ? (
            <>{mappableEvents.length} {mappableEvents.length === 1 ? 'event' : 'events'} on map</>
          ) : (
            <>{mappableEvents.length} of {events.length} events shown on map</>
          )}
        </span>
        {mappableEvents.length < events.length && mappableEvents.length > 0 && (
          <span className="text-[11px] text-warm-gray-dark/70">
            {events.length - mappableEvents.length} without coordinates
          </span>
        )}
      </div>

      {/* Map container */}
      <div className="rounded-2xl overflow-hidden shadow-card border border-warm-gray/20 min-h-[400px] md:min-h-[500px] relative">
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          className="h-[400px] md:h-[500px] w-full z-0"
          style={{ background: '#f5f0eb' }}
        >
          <TileLayer
            attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={center} zoom={zoom} />

          {Array.from(groupedEvents.entries()).map(([key, group]) => {
            const first = group[0]!
            const position: [number, number] = [first.lat!, first.lng!]

            return (
              <Marker key={key} position={position} icon={sageIcon}>
                <Popup maxWidth={280} minWidth={200}>
                  <div className="font-sans">
                    {group.length === 1 ? (
                      <EventPopupContent event={first} onEventClick={onEventClick} />
                    ) : (
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-bark/60 uppercase tracking-wide mb-1">
                          {first.location} &middot; {group.length} events
                        </p>
                        {group.slice(0, 4).map((ev) => (
                          <EventPopupContent key={ev.id} event={ev} onEventClick={onEventClick} compact />
                        ))}
                        {group.length > 4 && (
                          <p className="text-[11px] text-warm-gray-dark italic pt-1">
                            +{group.length - 4} more at this venue
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* Empty overlay */}
        {mappableEvents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] z-10 pointer-events-none">
            <div className="text-center px-4">
              <p className="text-[14px] text-warm-gray-dark font-medium">
                No mappable events
              </p>
              <p className="text-[12px] text-warm-gray-dark/70 mt-1">
                {events.length > 0
                  ? "These events don't have location coordinates yet."
                  : 'No events match your current filters.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EventPopupContent({
  event,
  onEventClick,
  compact = false,
}: {
  event: EventCardData
  onEventClick?: (id: string) => void
  compact?: boolean
}) {
  return (
    <div className={cn(compact ? 'pb-2 border-b border-warm-gray/20 last:border-0 last:pb-0' : '')}>
      <p className={cn('font-semibold text-bark leading-snug', compact ? 'text-[12px]' : 'text-[13px]')}>
        {event.title}
      </p>
      <p className={cn('text-warm-gray-dark mt-0.5', compact ? 'text-[10px]' : 'text-[11px]')}>
        {event.date}
      </p>
      {!compact && event.location && (
        <p className="text-[11px] text-warm-gray-dark mt-0.5">{event.location}</p>
      )}
      {event.price && (
        <span className={cn(
          'inline-block mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
          event.price === 'Free' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
        )}>
          {event.price}
        </span>
      )}
      {onEventClick && (
        <button
          type="button"
          onClick={() => onEventClick(event.id)}
          className={cn(
            'block mt-1 font-medium text-sage hover:underline',
            compact ? 'text-[10px]' : 'text-[11px]'
          )}
        >
          View Details →
        </button>
      )}
    </div>
  )
}
