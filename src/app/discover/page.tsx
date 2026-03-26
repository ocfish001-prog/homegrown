'use client'

import { useRouter } from 'next/navigation'
import { Compass, ArrowLeft } from 'lucide-react'

export default function DiscoverPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen bg-cream px-6 py-16 items-center justify-center text-center mb-nav md:mb-0">
      <div className="w-16 h-16 rounded-full bg-sage/15 flex items-center justify-center mb-5">
        <Compass className="w-8 h-8 text-sage" aria-hidden="true" />
      </div>

      <h1 className="font-serif text-[26px] text-bark leading-tight mb-3">
        Discover is on its way
      </h1>
      <p className="text-[15px] text-warm-gray-dark max-w-xs leading-relaxed mb-8">
        Curated picks, trending classes, and personalized recommendations for your family — coming in the next phase.
      </p>

      <p className="text-[13px] text-warm-gray-dark mb-6">
        In the meantime, browse everything on the home feed.
      </p>

      <button
        type="button"
        onClick={() => router.push('/')}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-sage text-white text-[14px] font-medium hover:bg-sage/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Browse Events
      </button>
    </div>
  )
}
