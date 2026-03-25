import { Card, CardContent } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Page heading */}
      <h1 className="text-3xl md:text-4xl font-semibold text-bark mb-2">
        <span aria-hidden="true">🌱</span> Events near you
      </h1>
      <p className="text-stone mb-8 text-base">
        Homeschool-friendly activities, classes, and gatherings in your area.
      </p>

      {/* Empty state */}
      <Card className="border-sage/30 bg-white/60">
        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">
            🌿
          </div>
          <h2 className="text-xl font-semibold text-bark mb-2">No events yet</h2>
          <p className="text-stone max-w-sm">
            Check back soon. We&apos;re building connections in your area.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
