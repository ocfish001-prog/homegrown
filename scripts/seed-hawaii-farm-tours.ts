/**
 * Seed Hawaii Farm Tours into Supabase
 * Source: hawaii-manual
 * Run: npx tsx scripts/seed-hawaii-farm-tours.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wbzxfwlgldrobubcssoa.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indienhmd2xnbGRyb2J1YmNzc29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5Njc3NiwiZXhwIjoyMDkwMDcyNzc2fQ.a6Ghoy_6ybrR4TLsG3ZMAZPhQ1jxtu3RTl8zJxPseP4'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
})

// Venues for the farm tours
const venues = [
  {
    id: 'venue-kona-coffee-living-history',
    name: 'Kona Coffee Living History Farm (Uchida Farm)',
    address: 'Mamalahoa Hwy, Captain Cook, HI 96704',
    city: 'Captain Cook',
    state: 'HI',
    lat: 19.5000,
    lng: -155.9200,
  },
  {
    id: 'venue-greenwell-farms',
    name: 'Greenwell Farms',
    address: '81-6581 Mamalahoa Hwy, Kealakekua, HI 96750',
    city: 'Kealakekua',
    state: 'HI',
    lat: 19.5330,
    lng: -155.9190,
  },
  {
    id: 'venue-heavenly-hawaiian',
    name: 'Heavenly Hawaiian Kona Coffee Farm',
    address: 'Holualoa, Kona, HI',
    city: 'Holualoa',
    state: 'HI',
    lat: 19.6300,
    lng: -155.9600,
  },
  {
    id: 'venue-kona-coffee-and-tea',
    name: 'Kona Coffee & Tea Farm',
    address: 'Holualoa, Kona, HI',
    city: 'Holualoa',
    state: 'HI',
    lat: 19.6200,
    lng: -155.9500,
  },
  {
    id: 'venue-ohcf',
    name: 'Original Hawaiian Chocolate Factory',
    address: 'Kealakekua, South Kona, HI',
    city: 'Kealakekua',
    state: 'HI',
    lat: 19.5100,
    lng: -155.9100,
  },
  {
    id: 'venue-mauna-loa-visitor',
    name: 'Mauna Loa Macadamia Nut Visitor Center',
    address: '16-701 Macadamia Road, Keaau, HI 96749',
    city: 'Keaau',
    state: 'HI',
    lat: 19.6200,
    lng: -155.0500,
  },
  {
    id: 'venue-parker-ranch',
    name: 'Parker Ranch / Paniolo Heritage Center',
    address: '66-1304 Mamalahoa Hwy, Kamuela (Waimea), HI 96743',
    city: 'Waimea',
    state: 'HI',
    lat: 20.0230,
    lng: -155.6660,
  },
  {
    id: 'venue-kona-coffee-festival',
    name: 'Kailua-Kona (multiple venues)',
    address: 'Kailua-Kona, HI',
    city: 'Kailua-Kona',
    state: 'HI',
    lat: 19.6406,
    lng: -155.9969,
  },
  {
    id: 'venue-hawaii-4h',
    name: 'UH Cooperative Extension — Hawaii County',
    address: 'Hilo, HI',
    city: 'Hilo',
    state: 'HI',
    lat: 19.7241,
    lng: -155.0900,
  },
  {
    id: 'venue-gofarm-hawaii',
    name: 'GoFarm Hawaii',
    address: 'Hawaii Island, HI',
    city: 'Hawaii Island',
    state: 'HI',
    lat: 19.8968,
    lng: -155.5828,
  },
]

// Events - dates relative to current time for relevance
// For recurring/walk-in events we set the date to a near-future Tuesday (for the weekly recurring ones)
// Annual events get their 2026 date
function nextWeekday(dayOfWeek: number, weeksAhead = 0): string {
  const now = new Date()
  const daysUntil = (dayOfWeek - now.getDay() + 7) % 7 || 7
  const d = new Date(now)
  d.setDate(now.getDate() + daysUntil + weeksAhead * 7)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

function nextDate(month: number, day: number, year: number): string {
  return new Date(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T10:00:00-10:00`).toISOString()
}

const events = [
  // 1. Kona Coffee Living History Farm — Tue & Fri walk-ins
  {
    id: 'hawaii-manual-kona-coffee-living-history-tue',
    externalId: 'kona-coffee-living-history-tue',
    source: 'hawaii-manual',
    title: 'Kona Coffee Living History Farm — Tuesday Walk-in Tour',
    description: `The ONLY living history coffee farm in the nation. 5.5-acre historic farm depicting Japanese immigrant farm life 1920–1945. Costumed interpreters demonstrate traditional crafts, agricultural activities, coffee milling (kuriba & hoshidana), and daily life. Self-guided walking tour through coffee orchard, farmhouse, and coffee mill.\n\nField trips for educational groups available (in-person and virtual). Great for homeschool families!\n\nOpen Tuesdays & Fridays, 10am–2pm. No reservation required for groups under 20.`,
    startDate: nextWeekday(2), // Tuesday
    endDate: (() => { const d = new Date(nextWeekday(2)); d.setHours(14,0,0,0); return d.toISOString() })(),
    isFree: false,
    cost: '$20/adult, $10/student (7–17), Free under 7. Hawaii residents: $15/$5. Museums for All: $3/pp with EBT/SNAP/WIC.',
    imageUrl: null,
    externalUrl: 'https://konahistorical.org/kona-coffee-living-history-farm',
    ageRange: 'all_ages',
    relevanceScore: 95,
    isApproved: true,
    venueId: 'venue-kona-coffee-living-history',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'hawaii-manual-kona-coffee-living-history-fri',
    externalId: 'kona-coffee-living-history-fri',
    source: 'hawaii-manual',
    title: 'Kona Coffee Living History Farm — Friday Walk-in Tour',
    description: `The ONLY living history coffee farm in the nation. 5.5-acre historic farm depicting Japanese immigrant farm life 1920–1945. Costumed interpreters demonstrate traditional crafts, agricultural activities, coffee milling, and daily life.\n\nOpen Tuesdays & Fridays, 10am–2pm. No reservation required for groups under 20.`,
    startDate: nextWeekday(5), // Friday
    endDate: (() => { const d = new Date(nextWeekday(5)); d.setHours(14,0,0,0); return d.toISOString() })(),
    isFree: false,
    cost: '$20/adult, $10/student (7–17), Free under 7',
    imageUrl: null,
    externalUrl: 'https://konahistorical.org/kona-coffee-living-history-farm',
    ageRange: 'all_ages',
    relevanceScore: 95,
    isApproved: true,
    venueId: 'venue-kona-coffee-living-history',
    updatedAt: new Date().toISOString(),
  },

  // 2. Greenwell Farms — FREE daily tours 9am-3pm
  {
    id: 'hawaii-manual-greenwell-farms',
    externalId: 'greenwell-farms-daily',
    source: 'hawaii-manual',
    title: 'Greenwell Farms — Free Daily Coffee Farm Tour',
    description: `One of the oldest family coffee farms on the Big Island (since 1850). Free daily farm tours showing how coffee is grown, harvested, processed, and roasted. Gift shop with 100% Kona coffee and Hawaiian chocolates.\n\nOpen every day, 9am–3pm. Walk-in, no reservation needed.\n\nHistoric property connected to Henry Nicholas Greenwell (Kona coffee pioneer). Part of the Kona Coffee Cultural Festival events.`,
    startDate: nextWeekday(1), // Monday
    endDate: (() => { const d = new Date(nextWeekday(1)); d.setHours(15,0,0,0); return d.toISOString() })(),
    isFree: true,
    cost: 'Free',
    imageUrl: null,
    externalUrl: 'https://www.greenwellfarms.com',
    ageRange: 'all_ages',
    relevanceScore: 98,
    isApproved: true,
    venueId: 'venue-greenwell-farms',
    updatedAt: new Date().toISOString(),
  },

  // 3. Heavenly Hawaiian Farms — tour by booking
  {
    id: 'hawaii-manual-heavenly-hawaiian',
    externalId: 'heavenly-hawaiian-tour',
    source: 'hawaii-manual',
    title: 'Heavenly Hawaiian Kona Coffee Farm Tour',
    description: `Rated #1 Kona Coffee Farm Tour. 1-hour walking tour covering seed-to-cup of their coffee operation. Unlimited samples of 4 coffees + candy samples + specialty coffee sample.\n\nAlso offers: Paniolo Roasting Class, Brew Your Best Cup class, Paint n' Sip class. Farm has been operating since 1994.\n\nPre-booking preferred via online calendar. Great for families!`,
    startDate: nextWeekday(6), // Saturday
    endDate: (() => { const d = new Date(nextWeekday(6)); d.setHours(11,0,0,0); return d.toISOString() })(),
    isFree: false,
    cost: 'See website for current rates',
    imageUrl: null,
    externalUrl: 'https://heavenlyhawaiian.com/kona-coffee-farm-tour/',
    ageRange: 'family',
    relevanceScore: 90,
    isApproved: true,
    venueId: 'venue-heavenly-hawaiian',
    updatedAt: new Date().toISOString(),
  },

  // 4. Kona Coffee & Tea — multi-crop tour
  {
    id: 'hawaii-manual-kona-coffee-and-tea',
    externalId: 'kona-coffee-tea-farm-tour',
    source: 'hawaii-manual',
    title: 'Kona Coffee & Tea Farm Tour — Pick Your Own Cacao & More',
    description: `100% Kona Coffee farm operating since 1998. Farm tours through their agroforest — visitors pick their own cacao fruit, macadamia nuts, taste guava; see the full 25+ year family farm.\n\nAlso has a flagship café in downtown Kailua-Kona (open 6am–6pm). Multi-crop experience: coffee + cacao + macadamia + tropical fruit in one visit.\n\nBy appointment — book via online calendar.`,
    startDate: nextWeekday(6, 1), // Saturday next week
    endDate: (() => { const d = new Date(nextWeekday(6, 1)); d.setHours(12,0,0,0); return d.toISOString() })(),
    isFree: false,
    cost: 'See website for current rates',
    imageUrl: null,
    externalUrl: 'https://www.konacoffeeandtea.com/pages/farm-tour',
    ageRange: 'all_ages',
    relevanceScore: 90,
    isApproved: true,
    venueId: 'venue-kona-coffee-and-tea',
    updatedAt: new Date().toISOString(),
  },

  // 5. Original Hawaiian Chocolate Factory — by appointment
  {
    id: 'hawaii-manual-ohcf',
    externalId: 'ohcf-tour',
    source: 'hawaii-manual',
    title: "Original Hawaiian Chocolate Factory — Tree-to-Bar Tour",
    description: `Hawaii's first and original tree-to-bar chocolate factory. Tours show the entire chocolate production process from cacao tree to finished chocolate bar.\n\nThe Big Island is the ONLY place in the US where cacao is commercially grown. Extraordinary educational value for kids!\n\nBy appointment — contact via website to schedule.`,
    startDate: nextWeekday(4), // Thursday
    endDate: (() => { const d = new Date(nextWeekday(4)); d.setHours(11,0,0,0); return d.toISOString() })(),
    isFree: false,
    cost: 'See website for current rates',
    imageUrl: null,
    externalUrl: 'https://www.originalhawaiianChocolate.com',
    ageRange: 'all_ages',
    relevanceScore: 88,
    isApproved: true,
    venueId: 'venue-ohcf',
    updatedAt: new Date().toISOString(),
  },

  // 6. Mauna Loa Visitor Center — FREE Mon-Sat
  {
    id: 'hawaii-manual-mauna-loa-visitor',
    externalId: 'mauna-loa-visitor-daily',
    source: 'hawaii-manual',
    title: "Mauna Loa Macadamia Nut Visitor Center — Free Self-Guided Tour",
    description: `World's largest macadamia processor. Self-guided nature walk through macadamia nut trees (25+ plant and animal species). View of processing plant from second-floor walkway.\n\nFree samples of every macadamia nut flavor. Gift shop with exclusive merchandise. Macadamia ice cream for sale.\n\nOpen Mon–Sat, 9am–4pm. Closed Sundays. Walk-in, no reservation needed.`,
    startDate: nextWeekday(1), // Monday
    endDate: (() => { const d = new Date(nextWeekday(1)); d.setHours(16,0,0,0); return d.toISOString() })(),
    isFree: true,
    cost: 'Free',
    imageUrl: null,
    externalUrl: 'https://hawaiianhost.com/pages/maunaloa-visitor-center',
    ageRange: 'all_ages',
    relevanceScore: 95,
    isApproved: true,
    venueId: 'venue-mauna-loa-visitor',
    updatedAt: new Date().toISOString(),
  },

  // 7. Parker Ranch / Paniolo Heritage Center — FREE Mon-Sat
  {
    id: 'hawaii-manual-paniolo-heritage',
    externalId: 'paniolo-heritage-center-daily',
    source: 'hawaii-manual',
    title: "Parker Ranch Paniolo Heritage Center — Free Hawaiian Cowboy History",
    description: `Hawai'i's oldest (est. ~1847) and largest working ranch (~130,000 acres). The Paniolo Heritage Center at Pukalani Stables is FREE and features saddles, artifacts, paniolo (Hawaiian cowboy) history, and Pa'u riders museum.\n\nSelf-guided tours of two historic homes also available (Mana Hale & Puuopelu). Annual 4th of July Rodeo & Horse Races.\n\nPaniolo Heritage Center open Mon–Sat, 10am–2pm. Walk-in.`,
    startDate: nextWeekday(3), // Wednesday
    endDate: (() => { const d = new Date(nextWeekday(3)); d.setHours(14,0,0,0); return d.toISOString() })(),
    isFree: true,
    cost: 'Free (Heritage Center); Home tours have fee',
    imageUrl: null,
    externalUrl: 'https://paniolopreservation.org/heritage-center/',
    ageRange: 'all_ages',
    relevanceScore: 92,
    isApproved: true,
    venueId: 'venue-parker-ranch',
    updatedAt: new Date().toISOString(),
  },

  // 8. Kona Coffee Cultural Festival — November 2026
  {
    id: 'hawaii-manual-kona-coffee-fest-2026',
    externalId: 'kona-coffee-fest-2026',
    source: 'hawaii-manual',
    title: "Kona Coffee Cultural Festival 2026 — Hawaii's Oldest Food Festival",
    description: `Hawaii's oldest food festival — 10 days every November celebrating Kona coffee culture. Family-friendly events include:\n\n🌱 Kona Coffee Living History Farm Tour\n☕ Kona Coffee & Tea Annual Harvest (hands-on!)\n🎨 Cultural Activities at Donkey Mill Art Center\n🎶 Multicultural Showcase & Lantern Parade\n🍳 Coffee Tasting Workshop: How to Brew the Perfect Cup\n🎪 Ho'olaule'a (Community Festival)\n🏃 Made in Hawai'i Artisan Market\n\nVaries by event — some FREE, some ticketed. Annual event every November.`,
    startDate: nextDate(11, 6, 2026),
    endDate: nextDate(11, 15, 2026),
    isFree: false,
    cost: 'Varies — some events free, some ticketed',
    imageUrl: null,
    externalUrl: 'https://konacoffeefest.com/events/',
    ageRange: 'all_ages',
    relevanceScore: 96,
    isApproved: true,
    venueId: 'venue-kona-coffee-festival',
    updatedAt: new Date().toISOString(),
  },

  // 9. Parker Ranch July 4th Rodeo — annual
  {
    id: 'hawaii-manual-parker-ranch-rodeo-2026',
    externalId: 'parker-ranch-rodeo-2026',
    source: 'hawaii-manual',
    title: "Parker Ranch July 4th Rodeo & Horse Races 2026",
    description: `Annual 4th of July celebration with authentic paniolo (Hawaiian cowboy) rodeo skills and horse races. Community event celebrating Hawaiian ranching heritage.\n\nSpectacular family event — kids love the rodeo action and Hawaiian cowboy culture.\n\nAnnual event at Parker Ranch Rodeo Arena, Waimea (Kamuela). Check parkerranch.com for ticket info.`,
    startDate: nextDate(7, 4, 2026),
    endDate: nextDate(7, 4, 2026),
    isFree: false,
    cost: 'See website for ticket info',
    imageUrl: null,
    externalUrl: 'https://parkerranch.com/experiences/',
    ageRange: 'all_ages',
    relevanceScore: 93,
    isApproved: true,
    venueId: 'venue-parker-ranch',
    updatedAt: new Date().toISOString(),
  },

  // 10. Hawaii 4-H — recurring
  {
    id: 'hawaii-manual-hawaii-4h',
    externalId: 'hawaii-4h-program',
    source: 'hawaii-manual',
    title: "Hawaii 4-H Program — Youth Agricultural Education (Homeschool Friendly)",
    description: `UH Cooperative Extension runs the statewide Hawaii 4-H program. Youth agricultural, environmental, and life skills education. Big Island (Hawaii County) 4-H clubs are active; programs cover livestock, gardening, food science, and agricultural projects.\n\nHomeschool families are eligible to join 4-H without being enrolled in public school! Ages 5–18.\n\n4-H members exhibit at the annual Big Island/Hawaii County Fair (typically August/September in Hilo). Nominal membership fees.`,
    startDate: nextWeekday(6), // Saturday
    endDate: null,
    isFree: false,
    cost: 'Nominal 4-H membership fees',
    imageUrl: null,
    externalUrl: 'https://manoa.hawaii.edu/ctahr/4h/',
    ageRange: 'family',
    relevanceScore: 85,
    isApproved: true,
    venueId: 'venue-hawaii-4h',
    updatedAt: new Date().toISOString(),
  },

  // 11. GoFarm Hawaii — recurring free webinars
  {
    id: 'hawaii-manual-gofarm-agcurious',
    externalId: 'gofarm-agcurious-webinar',
    source: 'hawaii-manual',
    title: "GoFarm Hawaii AgCurious Webinar — Free Online Farm Info Session",
    description: `GoFarm Hawaiʻi's free AgCurious info sessions are open to the public. 2-hour online sessions covering beginning farmer training, Hawaii Island farming opportunities, and agricultural programs.\n\nAlso offers: AgOrchard (10 farm visits over 6 months, $200) and AgXposure (5-week Saturday farm visits program). Free Community Edition video series on home gardening available on YouTube.\n\nApril 7, 2026: AgCurious webinar 5:30–7pm. Check gofarmhawaii.org for upcoming dates.`,
    startDate: nextDate(4, 7, 2026),
    endDate: (() => {
      const d = new Date(nextDate(4, 7, 2026))
      d.setHours(19, 0, 0, 0)
      return d.toISOString()
    })(),
    isFree: true,
    cost: 'Free (AgCurious); $200 for paid programs',
    imageUrl: null,
    externalUrl: 'https://gofarmhawaii.org',
    ageRange: 'family',
    relevanceScore: 80,
    isApproved: true,
    venueId: 'venue-gofarm-hawaii',
    updatedAt: new Date().toISOString(),
  },
]

async function run() {
  console.log('Seeding Hawaii farm tour venues...')
  
  const { error: venueError } = await supabase
    .from('venues')
    .upsert(venues, { onConflict: 'id', ignoreDuplicates: false })
  
  if (venueError) {
    console.error('Venue upsert error:', venueError.message)
    process.exit(1)
  }
  console.log(`✅ ${venues.length} venues upserted`)

  console.log('Seeding Hawaii farm tour events...')
  const { error: eventError } = await supabase
    .from('events')
    .upsert(events, { onConflict: 'id', ignoreDuplicates: false })
  
  if (eventError) {
    console.error('Event upsert error:', eventError.message)
    process.exit(1)
  }
  console.log(`✅ ${events.length} events upserted`)
  console.log('\nDone! Farm tours seeded into Supabase.')
}

run()
