'use client'

import { useState } from 'react'
import { MapPin, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LocationState } from '@/lib/types'
import { RADIUS_OPTIONS, DEFAULT_LOCATION } from '@/lib/types'

interface LocationPickerProps {
  location: LocationState
  onLocationChange: (loc: LocationState) => void
  className?: string
}

export default function LocationPicker({
  location,
  onLocationChange,
  className,
}: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  function detectLocation() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported')
      return
    }
    setDetecting(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        // Reverse geocode with a free service
        let label = 'Your Location'
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          if (res.ok) {
            const data = await res.json()
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.suburb
            const state = data.address?.state
            if (city) label = state ? `${city}, ${state}` : city
          }
        } catch {
          // Use default label
        }
        onLocationChange({ ...location, lat: latitude, lng: longitude, label })
        setDetecting(false)
        setIsOpen(false)
      },
      (err) => {
        setDetecting(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied')
        } else {
          setGeoError('Could not detect location')
        }
      },
      { timeout: 10000 }
    )
  }

  function setRadius(r: number) {
    onLocationChange({ ...location, radius: r })
    setIsOpen(false)
  }

  function resetToDefault() {
    onLocationChange(DEFAULT_LOCATION)
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
        aria-label={`Location: ${location.label}, ${location.radius} mile radius. Tap to change.`}
        aria-expanded={isOpen}
      >
        <MapPin className="w-3.5 h-3.5 text-sage" aria-hidden="true" />
        <span>{location.label}</span>
        <span className="text-sage/70 text-[11px]">· {location.radius}mi</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-sage/70 transition-transform duration-150',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 mt-2 z-50',
            'w-64 bg-white rounded-xl shadow-lg border border-warm-gray/20',
            'p-3 space-y-3',
            'animate-fade-up'
          )}
          role="dialog"
          aria-label="Location settings"
        >
          {/* Detect my location */}
          <div>
            <p className="text-[11px] font-semibold text-warm-gray-dark uppercase tracking-wide mb-1.5">
              Location
            </p>
            <button
              type="button"
              onClick={detectLocation}
              disabled={detecting}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
                'text-[13px] text-bark font-medium',
                'bg-sage/10 hover:bg-sage/20',
                'transition-colors duration-150',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
              )}
            >
              {detecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-sage" aria-hidden="true" />
              )}
              {detecting ? 'Detecting...' : 'Use my location'}
            </button>
            {geoError && (
              <p className="text-[11px] text-mauve-dark mt-1 px-1">{geoError}</p>
            )}
            <button
              type="button"
              onClick={resetToDefault}
              className={cn(
                'w-full text-left px-3 py-2 mt-1 rounded-lg',
                'text-[13px] text-warm-gray-dark',
                'hover:bg-warm-gray/10',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
              )}
            >
              Reset to SF Bay Area
            </button>
          </div>

          {/* Radius filter */}
          <div>
            <p className="text-[11px] font-semibold text-warm-gray-dark uppercase tracking-wide mb-1.5">
              Radius
            </p>
            <div className="flex gap-2 flex-wrap">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadius(r)}
                  className={cn(
                    'px-3 py-1 rounded-full text-[12px] font-medium',
                    'transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage',
                    location.radius === r
                      ? 'bg-sage text-white'
                      : 'bg-warm-gray/10 text-bark hover:bg-sage/15'
                  )}
                  aria-pressed={location.radius === r}
                >
                  {r} mi
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
