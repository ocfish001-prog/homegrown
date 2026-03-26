import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: string
  headline: string
  body: string
  primaryAction?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export default function EmptyState({
  icon = '🌱',
  headline,
  body,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'py-16 px-6 text-center',
        'animate-fade-up',
        className
      )}
    >
      {/* Illustration — large emoji in styled container */}
      <div
        className={cn(
          'w-20 h-20 rounded-2xl mb-5',
          'bg-gradient-to-br from-sage/15 to-mauve/15',
          'flex items-center justify-center',
          'text-4xl',
          'shadow-sm'
        )}
        aria-hidden="true"
      >
        {icon}
      </div>

      <h2 className="text-[20px] font-semibold text-bark mb-2 font-sans">
        {headline}
      </h2>

      <p className="text-[14px] text-warm-gray-dark leading-relaxed max-w-[280px] mb-6">
        {body}
      </p>

      <div className="flex flex-col gap-2 w-full max-w-[240px]">
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className={cn(
              'w-full h-12 rounded-full',
              'bg-sage text-white',
              'text-[15px] font-medium',
              'transition-all duration-150',
              'hover:bg-sage-dark',
              'active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2'
            )}
          >
            {primaryAction.label}
          </button>
        )}

        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className={cn(
              'w-full h-12 rounded-full',
              'bg-transparent text-bark',
              'text-[15px] font-medium',
              'border border-warm-gray',
              'transition-all duration-150',
              'hover:border-sage/50 hover:text-sage',
              'active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2'
            )}
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}
