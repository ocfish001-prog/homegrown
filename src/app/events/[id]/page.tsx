'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft,
  Share2,
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

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [event, setEvent] = useState<HomegrownEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [shareSuccess, setShareSuccess] = useState(false)

  // Load saved state from localStorage
  useEffect(() => {
    if (!id) return
    try {
      const raw = localStorage.getItem('homegrown-saved-events')
      const savedIds: string[] = raw ? JSON.parse(raw) : []
      setSaved(savedIds.includes(id))
    } catch {
      // ignore
    }
  }, [id])

  function toggleSaved() {
    if (!id) return
    try {
      const raw = localStorage.getItem('homegrown-saved-events')
      const savedIds: string[] = raw ? JSON.parse(raw) : []
      const newIds = saved
        ? savedIds.filter((x) => x !== id)
        : [...savedIds, id]
      localStorage.setItem('homegrown-saved-events', JSON.stringify(newIds))
      setSaved(!saved)
    } catch {
      setSaved(!saved)
    }
  }

  // Dynamic OG tags / document title for event detail
  useEffect(() => {
    if (event) {
      document.title = `${event.title} — Homegrown`
      let ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null
      if (!ogTitle) {
        ogTitle = document.createElement('meta')
        ogTitle.setAttribute('property', 'og:title')
        document.head.appendChild(ogTitle)
      }
      ogTitle.setAttribute('content', event.title)

      let ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null
      if (!ogDesc) {
        ogDesc = document.createElement('meta')
        ogDesc.setAttribute('property', 'og:description')
        document.head.appendChild(ogDesc)
      }
      ogDesc.setAttribute('content', event.description?.slice(0, 160) ?? `${event.date} at ${event.location}`)

      if (event.imageUrl) {
        let ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null
        if (!ogImage) {
          ogImage = document.createElement('meta')
          ogImage.setAttribute('property', 'og:image')
          document.head.appendChild(ogImage)
        }
        ogImage.setAttribute('content', event.imageUrl)
      }
    }
    return () => {
      document.title = 'Homegrown'
    }
  }, [event])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // First try the API endpoint for Eventbrite events
        if (id.startsWith('eb-')) {
          const res = await fetch(`/api/events/${id}`)
          if (res.ok) {
            const data = await res.json()
            setEvent(data)
            setLoading(false)
            return
          }
        }
        // For SFPL and others, we need to search the events list
        // In Phase 3 this would use a proper DB; for now we hit the events API and find by ID
        const res = await fetch(`/api/events?radius=50`)
        if (res.ok) {
          const data = await res.json()
          const found = data.events?.find((e: HomegrownEvent) => e.id === id)
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
    if (id) load()
  }, [id])

  async function handleShare() {
    const shareData = {
      title: event?.title ?? 'Homegrown Event',
      text: `Check out this event: ${event?.title}`,
      url: window.location.href,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
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

  const gradient = event
    ? CATEGORY_GRADIENTS[event.category] ?? 'from-sage/15 to-mauve/10'
    : 'from-sage/15 to-mauve/10'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 text-sage animate-spin" aria-label="Loading event" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <Leaf className="w-10 h-10 text-sage" aria-hidden="true" />
        <h1 className="text-[18px] font-semibold text-bark">{error ?? 'Event not found'}</h1>
        <p className="text-[14px] text-warm-gray-dark">
          This event may no longer be available.
        </p>
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
          className="mt-2 px-4 py-2 rounded-full bg-sage text-white text-[14px] font-medium hover:bg-sage-dark transition-colors"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-nav md:pb-0">
      {/* Hero image / gradient */}
      <div className={cn('relative h-[220px] w-full bg-gradient-to-br', gradient)}>
        {event.imageUrl && (
          <Image
            src={event.imageUrl}
            alt=""
            fill
            className="absolute inset-0 object-cover"
            sizes="100vw"
            priority
          />
        )}
        {/* Back button */}
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
          aria-label="Go back"
          className={cn(
            'absolute top-4 left-4',
            'w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm',
            'flex items-center justify-center',
            'hover:bg-white transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
          )}
        >
          <ArrowLeft className="w-4 h-4 text-bark" aria-hidden="true" />
        </button>
        {/* Share button */}
        <button
          type="button"
          onClick={handleShare}
          aria-label={shareSuccess ? 'Link copied!' : 'Share event'}
          className={cn(
            'absolute top-4 right-4',
            'w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm',
            'flex items-center justify-center',
            'hover:bg-white transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
          )}
        >
          <Share2 className="w-4 h-4 text-bark" aria-hidden="true" />
        </button>
        {shareSuccess && (
          <div className="absolute top-14 right-4 bg-bark text-cream text-[12px] px-3 py-1.5 rounded-lg shadow-md">
            Link copied!
          </div>
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
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-4 pb-8 max-w-2xl mx-auto w-full">
        {/* Title */}
        <h1 className="font-serif text-[24px] text-bark leading-tight mb-3">
          {event.title}
        </h1>

        {/* Meta info — all the details needed to decide whether to go */}
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

          {/* Location + full address */}
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
        <div className="flex gap-2 mb-6">
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

          {/* Save to Calendar */}
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

        {/* Google Calendar option */}
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

        {/* Description — full, no truncation */}
        {event.description ? (
          <div className="mb-6 bg-cream-dark/40 rounded-2xl p-4">
            <h2 className="text-[15px] font-semibold text-bark mb-2">About this event</h2>
            <p className="text-[14px] text-bark/80 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        ) : (
          <div className="mb-6 bg-cream-dark/40 rounded-2xl p-4">
            <p className="text-[14px] text-warm-gray-dark italic">No description available.</p>
          </div>
        )}

        {/* Category tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {event.tags.map((tag) => (
              <CategoryPill key={tag} label={tag} variant="overlay" />
            ))}
          </div>
        )}

        {/* External link — secondary CTA */}
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
    </div>
  )
}
