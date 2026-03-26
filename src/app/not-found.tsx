import Link from 'next/link'
import { Leaf } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6 text-center">
      <div className="relative">
        <Leaf className="w-16 h-16 text-sage opacity-60" aria-hidden="true" />
        <span className="absolute -top-1 -right-1 text-2xl">404</span>
      </div>
      <div className="space-y-2">
        <h1 className="text-[22px] font-semibold text-bark">Page Not Found</h1>
        <p className="text-[15px] text-warm-gray-dark max-w-xs">
          This page has wandered off the trail. Let&apos;s get you back on track.
        </p>
      </div>
      <Link
        href="/"
        className="px-6 py-2.5 bg-sage text-white rounded-full text-[14px] font-medium hover:bg-sage-dark transition-colors"
      >
        Back to Home
      </Link>
    </div>
  )
}
