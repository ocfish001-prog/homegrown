'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart, CalendarDays, MapPin, Navigation } from 'lucide-react'
import CategoryPill from './CategoryPill'
import { cn } from '@/lib/utils'
import { formatDistance } from '@/lib/distance'

export interface EventCardData {
  id: string
  title: string
  description?: string
  category: string
  date: string       // human-readable full date + time
  dateISO?: string   // ISO 8601
  endDateISO?: string
  location: string
  address?: string
  organizer?: string
  imageUrl?: string
  isSaved?: boolean
  // Phase 2 additions
  distance?: number // miles
  price?: string
  url?: string
  source?: string
  ageRange?: string
  tags?: string[]
}

interface EventCardProps {
  event: EventCardData
  onSave?: (id: string, saved: boolean) => void
  onClick?: (id: string) => void
  className?: string
  style?: React.CSSProperties
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Classes': '📚',
  'Events': '🎉',
  'Co-ops': '🤝',
  'Camps': '⛺',
  'Workshops': '🛠️',
  'Field Trips': '🚌',
  'Support Groups': '💙',
  'Music': '🎵',
  'Arts': '🎨',
  'Community': '🌱',
  'Sports': '⚽',
  'Food & Drink': '🍎',
}

// Category to gradient map for fallback
const CATEGORY_GRADIENTS: Record<string, string> = {
  'Classes': 'from-sage/20 via-cream to-sage/10',
  'Events': 'from-sky/20 via-cream to-sky/10',
  'Co-ops': 'from-mauve/20 via-cream to-mauve/10',
  'Camps': 'from-bark/10 via-cream to-sage/15',
  'Workshops': 'from-sage/15 via-cream to-mauve/15',
  'Field Trips': 'from-sky/15 via-cream to-sage/15',
  'Support Groups': 'from-mauve/15 via-cream to-warm-gray/20',
  'Music': 'from-sky/20 via-cream to-mauve/10',
  'Arts': 'from-mauve/20 via-cream to-sage/10',
  'Community': 'from-sage/15 via-cream to-sky/15',
  'Sports': 'from-sky/15 via-cream to-bark/10',
  'Food & Drink': 'from-bark/15 via-cream to-sage/15',
}

const DEFAULT_GRADIENT = 'from-sage/15 via-cream to-mauve/15'

export default function EventCard({ event, onSave, onClick, className, style }: EventCardProps) {
  const [saved, setSaved] = useState(event.isSaved ?? false)
  const [heartAnim, setHeartAnim] = useState(false)

  const gradient = CATEGORY_GRADIENTS[event.category] ?? DEFAULT_GRADIENT

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newSaved = !saved
    setSaved(newSaved)
    setHeartAnim(true)
    setTimeout(() => setHeartAnim(false), 300)
    onSave?.(event.id, newSaved)
  }

  const handleClick = () => {
    onClick?.(event.id)
  }

  return (
    <article
      className={cn(
        'relative bg-white rounded-card shadow-card overflow-hidden',
        'cursor-pointer select-none',
        'transition-all duration-200 ease-smooth',
        'hover:shadow-card-hover hover:-translate-y-0.5',
        'active:scale-[0.97] active:shadow-card',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2',
        'animate-fade-up',
        className
      )}
      style={style}
      tabIndex={0}
      role="button"
      aria-label={`${event.title}, ${event.date}, ${event.location}`}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {/* Image area */}
      <div className={cn(
        'relative h-[160px] w-full overflow-hidden',
        `bg-gradient-to-br ${gradient}`
      )}>
        {event.imageUrl && (
          <Image
            src={event.imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}

        {/* No image — show category placeholder */}
        {!event.imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl opacity-20 select-none" aria-hidden="true">
              {CATEGORY_EMOJI[event.category] ?? '🌱'}
            </span>
          </div>
        )}

        {/* Category pill — bottom left */}
        <div className="absolute bottom-2 left-2">
          <CategoryPill
            label={event.category}
            variant="overlay"
          />
        </div>

        {/* Price badge — bottom right (if not free/unknown) */}
        {event.price && (
          <div className="absolute bottom-2 right-10">
            <span className={cn(
              'text-[11px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm',
              event.price === 'Free'
                ? 'bg-sage/80 text-white'
                : 'bg-white/80 text-bark'
            )}>
              {event.price}
            </span>
          </div>
        )}

        {/* Save button — top right */}
        <button
          type="button"
          onClick={handleSave}
          aria-label={saved ? `Unsave ${event.title}` : `Save ${event.title}`}
          aria-pressed={saved}
          className={cn(
            'absolute top-2 right-2',
            'w-8 h-8 rounded-full',
            'bg-white/80 backdrop-blur-sm',
            'flex items-center justify-center',
            'transition-all duration-200 ease-smooth',
            'hover:bg-white hover:scale-110',
            'active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage'
          )}
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-colors duration-200',
              heartAnim && 'animate-heart-pop',
              saved ? 'fill-mauve text-mauve' : 'text-bark/60'
            )}
          />
        </button>
      </div>

      {/* Content area */}
      <div className="px-3 pt-2 pb-3 flex flex-col gap-1">
        <h3 className="text-[14px] font-semibold text-bark leading-snug line-clamp-2">
          {event.title}
        </h3>

        <div className="flex flex-col gap-0.5 mt-0.5">
          {/* Date + time — full string already includes time from API */}
          <span className="text-[12px] text-warm-gray-dark flex items-center gap-1">
            <CalendarDays className="w-3 h-3 shrink-0" aria-hidden="true" />
            {event.date}
          </span>
          {/* Location + address (truncated) */}
          <span className="text-[12px] text-warm-gray-dark flex items-start gap-1">
            <MapPin className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="truncate">
              {event.location}
              {event.address && event.address !== event.location && (
                <span className="text-warm-gray-dark/70"> · {event.address}</span>
              )}
            </span>
          </span>
          {/* Distance from user */}
          {event.distance != null && (
            <span className="text-[11px] text-sage-dark flex items-center gap-1">
              <Navigation className="w-3 h-3 shrink-0" aria-hidden="true" />
              {formatDistance(event.distance)} away
            </span>
          )}
        </div>

        {/* Organizer */}
        {event.organizer && (
          <span className="text-[11px] text-mauve-dark font-medium mt-0.5 truncate">
            {event.organizer}
          </span>
        )}
      </div>
    </article>
  )
}
