'use client'

import { useRouter } from 'next/navigation'
import EmptyState from '@/components/ui/EmptyState'

export default function SavedPage() {
  const router = useRouter()
  return (
    <div className="flex flex-col min-h-screen items-center justify-center mb-nav md:mb-0">
      <EmptyState
        icon="🔖"
        headline="Your saved events"
        body="Tap the heart on any event to save it here. Build your schedule as you browse."
        primaryAction={{
          label: 'Browse Events',
          onClick: () => router.push('/'),
        }}
      />
    </div>
  )
}
