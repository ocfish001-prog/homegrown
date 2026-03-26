'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CategoryPillProps {
  label: string
  active?: boolean
  onSelect?: () => void
  onDismiss?: () => void
  size?: 'default' | 'sm'
  variant?: 'default' | 'overlay'
  className?: string
}

export default function CategoryPill({
  label,
  active = false,
  onSelect,
  onDismiss,
  size = 'default',
  variant = 'default',
  className,
}: CategoryPillProps) {
  if (variant === 'overlay') {
    return (
      <span
        className={cn(
          'inline-flex items-center h-7 px-2 rounded-full',
          'bg-white/85 backdrop-blur-sm',
          'text-[11px] font-medium text-bark',
          'border border-white/30',
          'whitespace-nowrap',
          className
        )}
      >
        {label}
      </span>
    )
  }

  const isSmall = size === 'sm'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'inline-flex items-center gap-1 rounded-full whitespace-nowrap',
        'transition-all duration-150 ease-smooth',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2',
        'active:scale-[0.96]',
        isSmall ? 'h-8 px-3 text-[13px]' : 'h-9 px-3 text-[14px]',
        active
          ? 'bg-sage text-white border border-sage hover:bg-sage-dark font-medium'
          : 'bg-white text-[#555555] border border-warm-gray hover:border-sage/60 hover:text-bark font-medium',
        className
      )}
    >
      <span>{label}</span>
      {active && onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="ml-0.5 -mr-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label={`Remove ${label} filter`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </button>
  )
}
