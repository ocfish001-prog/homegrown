import { cn } from '@/lib/utils'

interface SkeletonCardProps {
  className?: string
  style?: React.CSSProperties
}

export default function SkeletonCard({ className, style }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-card shadow-card overflow-hidden',
        className
      )}
      style={style}
      aria-hidden="true"
      role="presentation"
    >
      {/* Image skeleton */}
      <div className="h-[160px] skeleton" />

      {/* Content skeleton */}
      <div className="px-3 pt-2 pb-3 flex flex-col gap-2">
        {/* Title — 2 lines */}
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 skeleton rounded-sm w-full" />
          <div className="h-3.5 skeleton rounded-sm w-3/4" />
        </div>

        {/* Meta — date + location */}
        <div className="flex flex-col gap-1 mt-0.5">
          <div className="h-3 skeleton rounded-sm w-2/3" />
          <div className="h-3 skeleton rounded-sm w-1/2" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4"
      aria-label="Loading events..."
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard
          key={i}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}
