'use client'

import { Info, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface SetupBannerProps {
  message: string
  className?: string
}

export default function SetupBanner({ message, className }: SetupBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className={cn(
        'flex items-start gap-2 px-3 py-2.5 rounded-xl',
        'bg-sky/10 border border-sky/20 text-bark',
        'text-[13px]',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" aria-hidden="true" />
      <p className="flex-1 leading-snug">{message}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 text-warm-gray-dark hover:text-bark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}
