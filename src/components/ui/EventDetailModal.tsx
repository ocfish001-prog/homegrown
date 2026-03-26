'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import {
  X,
  Heart,
  CalendarDays,
  MapPin,
  User,
  ExternalLink,
  Calendar,
  Navigation,
  Loader2,
  Leaf,
  DollarSign,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HomegrownEvent } from '@/lib/types'
import { formatDistance } from '@/lib/distance'
import { getGoogleCalendarUrl } from '@/lib/ics'
import CategoryPill from '@/components/ui/CategoryPill'

// Category to gradient map
const CATEGORY_GRADIENTS: Record<string, string> = {
  'Classes': 'from-sage/20 to-sage/5',
  'Events': 'from-sky/20 to-sky/5',
  'Co-ops': 'from-mauve/20 to-mauve/5',
  'Camps': 'from-bark/10 to-sage/10',
  'Workshops': 'from-sage/15 to-mauve/10',
  'Field Trips': 'from-sky/15 to-sage/10',
  'Music': 'from-sky/20 to-mauve/10',
  'Arts': 'from-mauve/20 to-sage/10',
  'Community': 'from-sage/15 to-sky/10',
  'Sports': 'from-sky/15 to-bark/10',
  'Food & Drink': 'from-bark/15 to-sage/10',
}

interface EventDetailModalProps {
  eventId: string | null
  onClose: () => void
}

export default function EventDetailModal({ eventId, onClose }: EventDetailModalProps) {
  const [event, setEvent] = useState<HomegrownEvent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Animate in
  useEffect(() => {
    if (eventId) {
      setVisible(false)
      // Small delay to trigger CSS transition
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    }
  }, [eventId])

  // Load saved state
  useEffect(() => {
    if (!eventId) return
    try {
      const raw = localStorage.getItem('homegrown-saved-events')
      const savedIds: string[] = raw ? JSON.parse(raw) : []
      setSaved(savedIds.includes(eventId))
    } catch {
      // ignore
    }
  }, [eventId])

  // Fetch event
  useEffect(() => {
    if (!eventId) {
      setEvent(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    setEvent(null)

    async function load() {
      try {
        // Try direct API first (Eventbrite events)
        if (eventId!.startsWith('eb-')) {
          const res = await fetch(`/api/events/${eventId}`)
          if (res.ok) {
            const data = await res.json()
            setEvent(data)
            setLoading(false)
            return
          }
        }
        // Fallback: search events list by ID
        const res = await fetch(`/api/events?radius=50`)
        if (res.ok) {
          const data = await res.json()
          const found = data.events?.find((e: HomegrownEvent) => e.id === eventId)
          if (found) {
            setEvent(found)
          } else {
            setError('Event not found')
          }
        } else {
          setError('Could not load event')
        }
      } catch {
        setError('Could not load event')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [eventId])

  // Close on Escape
  const handleClose = useCallback(() => {
    setVisible(false)
    setTimeout(onClose, 250) // wait for transition
  }, [onClose])

  useEffect(() => {
    if (!eventId) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [eventId, handleClose])

  // Lock body scroll while open
  useEffect(() => {
    if (eventId) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [eventId])

  function toggleSaved() {
    if (!eventId) return
    try {
      const raw = localStorage.getItem('homegrown-saved-events')
      const savedIds: string[] = raw ? JSON.parse(raw) : []
      const newIds = saved
        ? savedIds.filter((x) => x !== eventId)
        : [...savedIds, eventId]
      localStorage.setItem('homegrown-saved-events', JSON.stringify(newIds))
      setSaved(!saved)
    } catch {
      setSaved(!saved)
    }
  }

  async function handleShare() {
    const shareData = {
      title: event?.title ?? 'Homegrown Event',
      text: `Check out this event: ${event?.title}`,
      url: `${window.location.origin}/events/${eventId}`,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareData.url)
      setShareSuccess(true)
      setTimeout(() => setShareSuccess(false), 2000)
    }
  }

  function handleSaveToCalendar() {
    if (!event) return
    const url = `/api/calendar?event=${encodeURIComponent(JSON.stringify(event))}`
    window.open(url, '_blank')
  }

  function handleGoogleCalendar() {
    if (!event) return
    window.open(getGoogleCalendarUrl(event), '_blank')
  }

  if (!mounted || !eventId) return null

  const gradient = event
    ? CATEGORY_GRADIENTS[event.category] ?? 'from-sage/15 to-mauve/10'
    : 'from-sage/15 to-mauve/10'

  const modal = (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[1000] bg-black/50 backdrop-blur-[2px]',
          'transition-opacity duration-250',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={event?.title ?? 'Event details'}
        className={cn(
          // Mobile: bottom sheet, full width
          'fixed bottom-0 left-0 right-0 z-[1001]',
          'max-h-[92dvh] rounded-t-[20px] bg-white overflow-hidden',
          'flex flex-col',
          // Desktop: centered dialog
          'md:top-1/2 md:left-1/2 md:bottom-auto md:right-auto',
          'md:-translate-x-1/2 md:-translate-y-1/2',
          'md:max-w-[640px] md:w-full md:max-h-[85dvh]',
          'md:rounded-[20px]',
          // Slide-up animation on mobile, fade on desktop
          'transition-all duration-250 ease-out',
          visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 md:translate-y-[-48%]'
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-2.5 pb-1 md:hidden flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-warm-gray/40" aria-hidden="true" />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close event details"
          className={cn(
            'absolute top-3 right-3 z-10',
            'w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-sm',
            'flex items-center justify-center',
            'hover:bg-white transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
          )}
        >
          <X className="w-4 h-4 text-bark" aria-hidden="true" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-sage animate-spin" aria-label="Loading event" />
            </div>
          )}

          {/* Error state */}
          {!loading && (error || !event) && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center">
              <Leaf className="w-10 h-10 text-sage" aria-hidden="true" />
              <h2 className="text-[18px] font-semibold text-bark">{error ?? 'Event not found'}</h2>
              <p className="text-[14px] text-warm-gray-dark">
                This event may no longer be available.
              </p>
            </div>
          )}

          {/* Event content */}
          {!loading && event && (
            <>
              {/* Hero image / gradient */}
              <div className={cn('relative h-[200px] w-full bg-gradient-to-br flex-shrink-0', gradient)}>
                {event.imageUrl && (
                  <Image
                    src={event.imageUrl}
                    alt=""
                    fill
                    className="absolute inset-0 object-cover"
                    sizes="(max-width: 640px) 100vw, 640px"
                    priority
                  />
                )}
                {/* Category pill */}
                <div className="absolute bottom-3 left-4">
                  <CategoryPill label={event.category} variant="overlay" />
                </div>
                {/* Price badge */}
                {event.price && (
                  <div className="absolute bottom-3 right-4">
                    <span className={cn(
                      'text-[12px] font-medium px-2.5 py-1 rounded-full',
                      event.price === 'Free'
                        ? 'bg-sage text-white'
                        : 'bg-white/90 text-bark'
                    )}>
                      {event.price}
                    </span>
                  </div>
                )}
                {/* Share feedback */}
                {shareSuccess && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-bark text-cream text-[12px] px-3 py-1.5 rounded-lg shadow-md">
                    Link copied!
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto w-full">
                {/* Title + share */}
                <div className="flex items-start gap-2 mb-3">
                  <h2 className="font-serif text-[22px] text-bark leading-tight flex-1">
                    {event.title}
                  </h2>
                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Share event"
                    className={cn(
                      'mt-0.5 w-8 h-8 rounded-full bg-warm-gray/10 flex items-center justify-center flex-shrink-0',
                      'hover:bg-warm-gray/20 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
                    )}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-bark/60" aria-hidden="true" />
                  </button>
                </div>

                {/* Meta info */}
                <div className="space-y-2.5 mb-5">
                  {/* Date + time */}
                  <div className="flex items-start gap-2 text-[14px] text-warm-gray-dark">
                    <CalendarDays className="w-4 h-4 mt-0.5 shrink-0 text-sage" aria-hidden="true" />
                    <div>
                      <span className="font-medium text-bark">{event.date}</span>
                      {event.endDateISO && (() => {
                        const end = new Date(event.endDateISO)
                        const endTime = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                        return <span className="text-warm-gray-dark"> – {endTime}</span>
                      })()}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2 text-[14px] text-warm-gray-dark">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-sage" aria-hidden="true" />
                    <div>
                      <span className="font-medium text-bark">{event.location}</span>
                      {event.address && event.address !== event.location && (
                        <p className="text-[13px] text-warm-gray-dark mt-0.5">{event.address}</p>
                      )}
                    </div>
                  </div>

                  {/* Get Directions */}
                  {(event.address || event.location) && (() => {
                    const destination = encodeURIComponent(event.address ?? event.location)
                    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`
                    return (
                      <div className="flex items-start gap-2 text-[14px]">
                        <Navigation className="w-4 h-4 mt-0.5 shrink-0 text-sage" aria-hidden="true" />
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sage-dark hover:underline"
                        >
                          Get Directions
                        </a>
                      </div>
                    )
                  })()}

                  {/* Distance */}
                  {event.distance != null && (
                    <div className="flex items-center gap-2 text-[13px] text-sage-dark">
                      <Navigation className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{formatDistance(event.distance)} from you</span>
                    </div>
                  )}

                  {/* Cost */}
                  {event.price && (
                    <div className="flex items-center gap-2 text-[14px] text-warm-gray-dark">
                      <DollarSign className="w-4 h-4 shrink-0 text-sage" aria-hidden="true" />
                      <span className={cn(
                        'font-medium',
                        event.price === 'Free' ? 'text-moss' : 'text-bark'
                      )}>
                        {event.price}
                      </span>
                    </div>
                  )}

                  {/* Age range */}
                  {event.ageRange && (
                    <div className="flex items-center gap-2 text-[14px] text-warm-gray-dark">
                      <Users className="w-4 h-4 shrink-0 text-mauve" aria-hidden="true" />
                      <span>
                        {{
                          young_kids: 'Young Kids (0–7)',
                          older_kids: 'Older Kids (8–14)',
                          all_ages: 'All Ages',
                          family: 'Family',
                        }[event.ageRange] ?? event.ageRange}
                      </span>
                    </div>
                  )}

                  {/* Organizer */}
                  {event.organizer && (
                    <div className="flex items-center gap-2 text-[14px] text-warm-gray-dark">
                      <User className="w-4 h-4 shrink-0 text-mauve" aria-hidden="true" />
                      <span>
                        <span className="text-warm-gray-dark text-[13px]">Organized by </span>
                        <span className="font-medium text-bark">{event.organizer}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mb-4">
                  {/* Save/Interested */}
                  <button
                    type="button"
                    onClick={toggleSaved}
                    aria-pressed={saved}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2',
                      'h-11 rounded-full text-[14px] font-medium',
                      'transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage',
                      saved
                        ? 'bg-mauve text-white'
                        : 'bg-mauve/10 text-mauve-dark hover:bg-mauve/20'
                    )}
                  >
                    <Heart className={cn('w-4 h-4', saved && 'fill-white')} aria-hidden="true" />
                    {saved ? 'Saved' : 'Save'}
                  </button>

                  {/* Add to Calendar */}
                  <button
                    type="button"
                    onClick={handleSaveToCalendar}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2',
                      'h-11 rounded-full text-[14px] font-medium',
                      'bg-sage/10 text-sage-dark hover:bg-sage/20',
                      'transition-colors duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
                    )}
                  >
                    <CalendarDays className="w-4 h-4" aria-hidden="true" />
                    Add to Calendar
                  </button>
                </div>

                {/* Google Calendar */}
                {event.dateISO && (
                  <button
                    type="button"
                    onClick={handleGoogleCalendar}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 mb-5',
                      'h-10 rounded-full text-[13px] font-medium',
                      'text-warm-gray-dark border border-warm-gray/30',
                      'hover:bg-warm-gray/5 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
                    )}
                  >
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    Add to Google Calendar
                  </button>
                )}

                {/* Description */}
                {event.description ? (
                  <div className="mb-6 bg-cream-dark/40 rounded-2xl p-4">
                    <h3 className="text-[15px] font-semibold text-bark mb-2">About this event</h3>
                    <p className="text-[14px] text-bark/80 leading-relaxed whitespace-pre-line">
                      {event.description}
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 bg-cream-dark/40 rounded-2xl p-4">
                    <p className="text-[14px] text-warm-gray-dark italic">No description available.</p>
                  </div>
                )}

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <CategoryPill key={tag} label={tag} variant="overlay" />
                    ))}
                  </div>
                )}

                {/* External link */}
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'w-full flex items-center justify-center gap-2',
                      'h-10 rounded-full text-[13px] font-medium',
                      'text-warm-gray-dark border border-warm-gray/30',
                      'hover:bg-warm-gray/5 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
                    )}
                  >
                    View on {event.source === 'eventbrite' ? 'Eventbrite' : event.source === 'sfpl' ? 'SFPL' : 'original site'}
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(modal, document.body)
}
