/**
 * Seed Supabase with 70 Hawaii events from the research CSV.
 * Source: homegrown-hawaii-apr-may-2026.csv
 * Run: node scripts/seed-hawaii-apr-may-csv.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbzxfwlgldrobubcssoa.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indienhmd2xnbGRyb2J1YmNzc29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5Njc3NiwiZXhwIjoyMDkwMDcyNzc2fQ.a6Ghoy_6ybrR4TLsG3ZMAZPhQ1jxtu3RTl8zJxPseP4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// HST = UTC-10
function hst(year, month, day, hour = 9, minute = 0) {
  const h = String(hour).padStart(2, '0');
  const mi = String(minute).padStart(2, '0');
  const mo = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return new Date(`${year}-${mo}-${d}T${h}:${mi}:00-10:00`).toISOString();
}

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
}

function eventId(title, dateStr) {
  return `csv-${slug(title)}-${slug(dateStr)}`;
}

function mapAge(ageStr) {
  if (!ageStr) return 'all_ages';
  const a = ageStr.toLowerCase();
  if (a.includes('1-4') || a.includes('toddler') || a.includes('young_kids')) return 'young_kids';
  if (a.includes('family') || a.includes('keiki')) return 'family';
  if (a.includes('teen') || a.includes('older_kids')) return 'older_kids';
  if (a.includes('adults only') || a === 'adults') return null; // skip age filter for adults-only
  if (a.includes('all ages')) return 'all_ages';
  if (a.includes('family')) return 'family';
  return 'all_ages';
}

const NOW = new Date().toISOString();

// ─── NEW VENUES ──────────────────────────────────────────────────────────────
const NEW_VENUES = [
  {
    id: 'venue-edith-kanakaole-stadium',
    name: 'Edith Kanakaole Stadium',
    address: '350 Kalanikoa St',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7258,
    lng: -155.0924,
  },
  {
    id: 'venue-nani-mau-gardens',
    name: 'Nani Mau Gardens',
    address: '421 Makalika St',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.6996,
    lng: -155.0663,
  },
  {
    id: 'venue-waikoloa-marriott',
    name: 'Waikoloa Beach Marriott Resort & Spa',
    address: '69-275 Waikoloa Beach Dr',
    city: 'Waikoloa',
    state: 'HI',
    zip: '96738',
    lat: 19.9236,
    lng: -155.8809,
  },
  {
    id: 'venue-housmart-ben-franklin-hilo',
    name: "HouseMart Ben Franklin Crafts",
    address: '301 Maka\'ala St',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7094,
    lng: -155.0701,
  },
  {
    id: 'venue-willies-hot-chicken-kona',
    name: "Willie's Hot Chicken",
    address: '75-5660 Kopiko St',
    city: 'Kailua-Kona',
    state: 'HI',
    zip: '96740',
    lat: 19.6404,
    lng: -155.9976,
  },
  {
    id: 'venue-kona-elks-lodge',
    name: 'Kona Elks Lodge',
    address: '75-5660 Palani Rd',
    city: 'Kailua-Kona',
    state: 'HI',
    zip: '96740',
    lat: 19.6412,
    lng: -155.9969,
  },
  {
    id: 'venue-kona-sea-salt',
    name: 'Kona Sea Salt',
    address: 'Makako Bay Dr',
    city: 'Kailua-Kona',
    state: 'HI',
    zip: '96740',
    lat: 19.6447,
    lng: -156.0052,
  },
  {
    id: 'venue-mauna-kea-beach-hotel',
    name: 'Mauna Kea Beach Hotel',
    address: '62-100 Mauna Kea Beach Dr',
    city: 'Kohala Coast',
    state: 'HI',
    zip: '96743',
    lat: 20.0158,
    lng: -155.8163,
  },
  {
    id: 'venue-anna-ranch-waimea',
    name: 'Anna Ranch Heritage Center',
    address: '65-1480 Kawaihae Rd',
    city: 'Waimea',
    state: 'HI',
    zip: '96743',
    lat: 20.0221,
    lng: -155.6561,
  },
  {
    id: 'venue-kalakaua-park-hilo',
    name: 'Kalakaua Park',
    address: 'Kalakaua Park, Hilo',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7288,
    lng: -155.0892,
  },
  {
    id: 'venue-queens-marketplace',
    name: "Queen's Marketplace",
    address: '69-201 Waikoloa Beach Dr',
    city: 'Waikoloa',
    state: 'HI',
    zip: '96738',
    lat: 19.9248,
    lng: -155.8870,
  },
  {
    id: 'venue-makaeo-pavilion-kona',
    name: 'Makaeo Events Pavilion',
    address: 'Old Kona Airport State Recreation Area',
    city: 'Kailua-Kona',
    state: 'HI',
    zip: '96740',
    lat: 19.6571,
    lng: -155.9979,
  },
  {
    id: 'venue-uh-hilo',
    name: 'University of Hawaii at Hilo',
    address: '200 W Kawili St',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7022,
    lng: -155.0868,
  },
  {
    id: 'venue-hilo-hawaiian-hotel',
    name: 'Hilo Hawaiian Hotel',
    address: '71 Banyan Dr',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7227,
    lng: -155.0709,
  },
  {
    id: 'venue-mamane-street-honokaa',
    name: 'Mamane Street',
    address: 'Mamane St',
    city: 'Honokaa',
    state: 'HI',
    zip: '96727',
    lat: 20.0836,
    lng: -155.4677,
  },
  {
    id: 'venue-honokaa-sports-complex',
    name: 'Honokaa Sports Complex',
    address: 'Honokaa Sports Complex',
    city: 'Honokaa',
    state: 'HI',
    zip: '96727',
    lat: 20.0836,
    lng: -155.4670,
  },
  {
    id: 'venue-rose-andrade-arena',
    name: 'Rose Andrade Correia Arena',
    address: '45-565 Plumeria St',
    city: 'Honokaa',
    state: 'HI',
    zip: '96727',
    lat: 20.0820,
    lng: -155.4664,
  },
  {
    id: 'venue-hapuna-golf-course',
    name: 'Hapuna Golf Course',
    address: '62-100 Kauna\'oa Dr',
    city: 'Kohala Coast',
    state: 'HI',
    zip: '96743',
    lat: 20.0021,
    lng: -155.8267,
  },
  {
    id: 'venue-alii-drive-kona',
    name: "Ali'i Drive",
    address: "Ali'i Dr",
    city: 'Kailua-Kona',
    state: 'HI',
    zip: '96740',
    lat: 19.6377,
    lng: -155.9956,
  },
  {
    id: 'venue-lava-lava-beach-club',
    name: "Lava Lava Beach Club at A-Bay",
    address: '69-1081 Ku\'uali\'i Pl',
    city: 'Waikoloa',
    state: 'HI',
    zip: '96738',
    lat: 19.9174,
    lng: -155.8889,
  },
  {
    id: 'venue-outrigger-kona',
    name: 'Outrigger Kona Resort & Spa',
    address: '78-128 Ehukai St',
    city: 'Kailua-Kona',
    state: 'HI',
    zip: '96740',
    lat: 19.5117,
    lng: -156.0280,
  },
  {
    id: 'venue-big-island-vanilla',
    name: 'Big Island Vanilla',
    address: '28-3291 Old Mamalahoa Hwy',
    city: 'Hakalau',
    state: 'HI',
    zip: '96710',
    lat: 19.8858,
    lng: -155.1280,
  },
  {
    id: 'venue-halau-uhane-pahoa',
    name: "Halau Uhane Lomilomi Lapa'au",
    address: 'Pahoa, HI',
    city: 'Pahoa',
    state: 'HI',
    zip: '96778',
    lat: 19.4928,
    lng: -154.9461,
  },
  {
    id: 'venue-kona-cloud-forest',
    name: 'Kona Cloud Forest Sanctuary',
    address: 'Mamalahoa Hwy',
    city: 'Kailua-Kona',
    state: 'HI',
    zip: '96740',
    lat: 19.6270,
    lng: -155.9590,
  },
  {
    id: 'venue-orchid-isle-manor',
    name: 'Orchid Isle Manor',
    address: 'Holualoa, HI',
    city: 'Holualoa',
    state: 'HI',
    zip: '96725',
    lat: 19.6270,
    lng: -155.9595,
  },
  {
    id: 'venue-waikoloa-film-festival',
    name: 'Waikoloa Village',
    address: 'Waikoloa Village',
    city: 'Waikoloa',
    state: 'HI',
    zip: '96738',
    lat: 19.9430,
    lng: -155.8237,
  },
  {
    id: 'venue-pahala-kau',
    name: "Ka'u District",
    address: "Ka'u District, HI",
    city: "Pahala",
    state: 'HI',
    zip: '96777',
    lat: 19.1964,
    lng: -155.4748,
  },
  {
    id: 'venue-kohala-coast-generic',
    name: 'Kohala Coast',
    address: 'Kohala Coast, HI',
    city: 'Kohala Coast',
    state: 'HI',
    zip: '96743',
    lat: 20.0034,
    lng: -155.8206,
  },
  {
    id: 'venue-hilo-restaurant-social',
    name: 'Restaurant of the Week (Hilo)',
    address: 'Hilo, HI',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7288,
    lng: -155.0862,
  },
];

// ─── EVENTS ──────────────────────────────────────────────────────────────────
const EVENTS = [];

// Helper
function addEvent(obj) {
  EVENTS.push({
    source: 'hawaii-manual',
    isApproved: true,
    relevanceScore: obj.relevanceScore || 75,
    updatedAt: NOW,
    ...obj,
  });
}

// 1. Merrie Monarch Festival
addEvent({
  id: eventId('63rd Annual Merrie Monarch Hula Festival', '2026-04-05'),
  title: '63rd Annual Merrie Monarch Hula Festival',
  description: "World's most prestigious hula competition. Week-long celebration of Hawaiian culture with kahiko & auana hula competitions, exhibitions, and musical entertainment honoring King Kalakaua.",
  startDate: hst(2026, 4, 5, 18, 0),
  endDate: hst(2026, 4, 11, 22, 0),
  isFree: false,
  cost: 'Ticketed (competition nights)',
  externalUrl: 'https://www.merriemonarch.com/',
  ageRange: 'all_ages',
  relevanceScore: 99,
  venueId: 'venue-edith-kanakaole-stadium',
});

// 2. Merrie Monarch Hawaiian Arts & Crafts Fair
addEvent({
  id: eventId('Official Merrie Monarch Hawaiian Arts Crafts Fair', '2026-04-08'),
  title: 'Official Merrie Monarch Hawaiian Arts & Crafts Fair',
  description: 'Over 150 artisans showcasing lauhala hats, lei humu papa, Polynesian crafts, local delicacies. Free admission. Live performances and hula demonstrations.',
  startDate: hst(2026, 4, 8, 9, 0),
  endDate: hst(2026, 4, 11, 17, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://www.merriemonarch.com/',
  ageRange: 'all_ages',
  relevanceScore: 96,
  venueId: 'venue-afook-chinen',
});

// 3. Big Island Chocolate Festival
addEvent({
  id: eventId('13th Annual Big Island Chocolate Festival', '2026-04-23'),
  title: '13th Annual Big Island Chocolate Festival',
  description: "Hawaii's all-local-cacao chocolate festival. Culinary demos, cacao farm tours, student chef competition, evening gala with 20-25 chocolate tastings, wine, beer, DJ dancing, silent auction.",
  startDate: hst(2026, 4, 23, 10, 0),
  endDate: hst(2026, 4, 25, 21, 30),
  isFree: false,
  cost: 'General $109 / Early Bird $95 / VIP $179',
  externalUrl: 'https://bigislandchocolatefestival.com/',
  ageRange: 'all_ages',
  relevanceScore: 88,
  venueId: 'venue-waikoloa-marriott',
});

// 4. Merrie Monarch Arts & Crafts Hawaii Festival (Nani Mau)
addEvent({
  id: eventId('Official Merrie Monarch Arts Crafts Hawaii Festival Nani Mau', '2026-04-08'),
  title: 'Merrie Monarch Arts & Crafts Hawaii Festival (Nani Mau Gardens)',
  description: 'Multi-day festival celebrating Hawaiian arts, crafts & food heritage. Over 100 artisans and food vendors. Free admission. Live performances throughout.',
  startDate: hst(2026, 4, 8, 9, 0),
  endDate: hst(2026, 4, 11, 17, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'http://www.hawaiiartsandcraftsfestival.com/',
  ageRange: 'all_ages',
  relevanceScore: 90,
  venueId: 'venue-nani-mau-gardens',
});

// 5. Merrie Monarch – Miss Aloha Hula (April 9)
addEvent({
  id: eventId('63rd Merrie Monarch Miss Aloha Hula', '2026-04-09'),
  title: '63rd Merrie Monarch – Miss Aloha Hula Competition',
  description: 'Inaugural night of the world-famous hula competition. Miss Aloha Hula competition featuring solo hula dancers performing kahiko.',
  startDate: hst(2026, 4, 9, 19, 0),
  isFree: false,
  cost: 'Ticketed',
  externalUrl: 'https://www.merriemonarch.com/',
  ageRange: 'all_ages',
  relevanceScore: 97,
  venueId: 'venue-edith-kanakaole-stadium',
});

// 6. Merrie Monarch – Group Hula Kahiko (April 10)
addEvent({
  id: eventId('63rd Merrie Monarch Group Hula Kahiko', '2026-04-10'),
  title: '63rd Merrie Monarch – Group Hula Kahiko',
  description: 'Group halau perform ancient hula (kahiko) style at the Merrie Monarch Festival competition.',
  startDate: hst(2026, 4, 10, 19, 0),
  isFree: false,
  cost: 'Ticketed',
  externalUrl: 'https://www.merriemonarch.com/',
  ageRange: 'all_ages',
  relevanceScore: 97,
  venueId: 'venue-edith-kanakaole-stadium',
});

// 7. Merrie Monarch – Auana & Awards (April 11)
addEvent({
  id: eventId('63rd Merrie Monarch Group Hula Auana Awards', '2026-04-11'),
  title: '63rd Merrie Monarch – Group Hula Auana & Awards',
  description: 'Final competition night — group halau perform modern hula (auana) style; awards ceremony follows.',
  startDate: hst(2026, 4, 11, 19, 0),
  isFree: false,
  cost: 'Ticketed',
  externalUrl: 'https://www.merriemonarch.com/',
  ageRange: 'all_ages',
  relevanceScore: 97,
  venueId: 'venue-edith-kanakaole-stadium',
});

// 8. TCBES Speaker Series (April 2)
addEvent({
  id: eventId('TCBES Speaker Series Anthropocene Ecosystems', '2026-04-02'),
  title: 'TCBES Speaker Series: Anthropocene Ecosystems',
  description: 'Seminar: 35,000 years of seafloor ecosystem data linking Last Glacial Maximum to modern anthropogenic change. Advance registration required.',
  startDate: hst(2026, 4, 2, 15, 30),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://imiloahawaii.org/event-calendar',
  ageRange: 'all_ages',
  relevanceScore: 78,
  venueId: 'venue-imiloa-astronomy',
});

// 9. Halau Okupu – Native Flowers (April 20)
addEvent({
  id: eventId('Halau Okupu Pua Native Flowers', '2026-04-20'),
  title: 'Halau Okupu Pua: Native Flowers',
  description: 'Monthly play & learn for keiki ages 1-4. Theme: native flowers of Hawaii. Art, exploration, learning about ilima, ohia, and more.',
  startDate: hst(2026, 4, 20, 9, 0),
  endDate: hst(2026, 4, 20, 11, 0),
  isFree: false,
  cost: 'Member $20 / General $30 (child + adult)',
  externalUrl: 'https://imiloahawaii.org/event-calendar',
  ageRange: 'young_kids',
  relevanceScore: 92,
  venueId: 'venue-imiloa-astronomy',
});

// 10. EHCC – 36 Views of Mauna Loa
addEvent({
  id: eventId('East Hawaii Cultural Center 36 Views of Mauna Loa', '2026-04-03'),
  title: 'EHCC – 36 Views of Mauna Loa (Exhibition Opening)',
  description: 'Exhibition featuring 18 artists exploring Mauna Loa through diverse artistic lenses. Curated by Andrzej Kramarz. Free admission.',
  startDate: hst(2026, 4, 3, 18, 0),
  endDate: hst(2026, 5, 1, 16, 0),
  isFree: true,
  cost: 'Free (suggested $5 donation)',
  externalUrl: 'https://ehcc.org/',
  ageRange: 'all_ages',
  relevanceScore: 82,
  venueId: 'venue-east-hawaii-cultural',
});

// 11. VAC Aloha Friday – first instance + note recurring
addEvent({
  id: eventId('VAC Aloha Friday Cultural Activities Apr 3', '2026-04-03'),
  title: 'VAC Aloha Friday Cultural Activities (Recurring)',
  description: 'Free weekly cultural demonstrations on the porch — lei making, botanical printing, ukulele, lauhala weaving on rotating schedule. Every Friday Apr-May, 11am-1pm. NPS entrance fee to enter park.',
  startDate: hst(2026, 4, 3, 11, 0),
  endDate: hst(2026, 4, 3, 13, 0),
  isFree: true,
  cost: 'Free (NPS park entry fee applies)',
  externalUrl: 'https://volcanoartcenter.org/home/events/',
  ageRange: 'all_ages',
  relevanceScore: 88,
  venueId: 'venue-vac-gallery-havo',
});

// 12. VAC Free Forest Tours
addEvent({
  id: eventId('VAC Free Forest Tours Niaulani Campus Apr 6', '2026-04-06'),
  title: 'VAC Free Ohia Forest Tours – Niaulani Campus (Recurring)',
  description: 'Guided tours of native Hawaiian rain forests. Learn about old-growth koa and ohia ecosystems and restoration. Every Monday Apr-May, 9:30-10:30am. No NPS fee required.',
  startDate: hst(2026, 4, 6, 9, 30),
  endDate: hst(2026, 4, 6, 10, 30),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://volcanoartcenter.org/home/events/',
  ageRange: 'all_ages',
  relevanceScore: 87,
  venueId: 'venue-vac-niaulani',
});

// 13. Adventures in Clay – Saturdays
addEvent({
  id: eventId('Adventures in Clay Monika Mann Saturday', '2026-04-04'),
  title: 'Adventures in Clay with Monika Mann (Saturday Series)',
  description: 'Beginner and experienced students explore wheel-throwing and handbuilding. Instructor guided. Saturdays through Apr 25, 10am-1pm.',
  startDate: hst(2026, 4, 4, 10, 0),
  endDate: hst(2026, 4, 25, 13, 0),
  isFree: false,
  cost: 'Paid (check VAC for pricing)',
  externalUrl: 'https://volcanoartcenter.org/home/events/',
  ageRange: 'all_ages',
  relevanceScore: 78,
  venueId: 'venue-vac-niaulani',
});

// 14. Handbuilding with Clay – Wednesday Series
addEvent({
  id: eventId('Handbuilding with Clay Wednesday Series Diane Hanzel', '2026-04-01'),
  title: 'Handbuilding with Clay – Wednesday Series (Diane Hanzel)',
  description: 'Ceramics series focused on handbuilding fundamentals in rainforest studio setting. Wednesdays through May 6, 3:30-6:30pm.',
  startDate: hst(2026, 4, 1, 15, 30),
  endDate: hst(2026, 5, 6, 18, 30),
  isFree: false,
  cost: 'Paid (check VAC for pricing)',
  externalUrl: 'https://volcanoartcenter.org/home/events/',
  ageRange: 'all_ages',
  relevanceScore: 74,
  venueId: 'venue-vac-niaulani',
});

// 15. Handbuilding with Clay – Sunday Series
addEvent({
  id: eventId('Handbuilding with Clay Sunday Series Diane Hanzel', '2026-04-05'),
  title: 'Handbuilding with Clay – Sunday Series (Diane Hanzel)',
  description: 'Sunday ceramics series. Sundays through May 3, 10am-1pm.',
  startDate: hst(2026, 4, 5, 10, 0),
  endDate: hst(2026, 5, 3, 13, 0),
  isFree: false,
  cost: 'Paid (check VAC for pricing)',
  externalUrl: 'https://volcanoartcenter.org/home/events/',
  ageRange: 'all_ages',
  relevanceScore: 72,
  venueId: 'venue-vac-niaulani',
});

// 16. Stories of Water: International Print Exchange (Opens Apr 4)
addEvent({
  id: eventId('Stories of Water International Print Exchange', '2026-04-04'),
  title: 'Stories of Water: International Print Exchange',
  description: 'International printmaking exhibition. Artists from diverse cultures explore their relationships with water through print. Opens April 4.',
  startDate: hst(2026, 4, 4, 10, 0),
  isFree: true,
  cost: 'Free (check DMAC)',
  externalUrl: 'https://donkeymillartcenter.org/event/?event=6712',
  ageRange: 'all_ages',
  relevanceScore: 80,
  venueId: 'venue-donkey-mill',
});

// 17. Opening Reception: Stories of Water (Apr 4 evening)
addEvent({
  id: eventId('Opening Reception Stories of Water Donkey Mill', '2026-04-04'),
  title: 'Opening Reception: Stories of Water – Donkey Mill',
  description: 'Opening reception for the international print exchange exhibition Stories of Water at Donkey Mill Art Center.',
  startDate: hst(2026, 4, 4, 17, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://donkeymillartcenter.org/event/?event=6717',
  ageRange: 'all_ages',
  relevanceScore: 78,
  venueId: 'venue-donkey-mill',
});

// 18. Creative Play: Parent-Child Sensory Art (May 8)
addEvent({
  id: eventId('Creative Play Parent Child Sensory Art Donkey Mill', '2026-05-08'),
  title: 'Creative Play: Parent-Child Sensory Art – Donkey Mill',
  description: 'Monthly parent-child sensory art activity. Hands-on creative exploration for young children and caregivers.',
  startDate: hst(2026, 5, 8, 10, 0),
  isFree: false,
  cost: 'Paid (check DMAC for pricing)',
  externalUrl: 'https://donkeymillartcenter.org/event/?event=6587',
  ageRange: 'family',
  relevanceScore: 88,
  venueId: 'venue-donkey-mill',
});

// 19. EKOLULAULE'A – Hilo (Apr 4)
addEvent({
  id: eventId("EKOLULAULEA Hilo", '2026-04-04'),
  title: "EKOLULAULE'A – Hilo",
  description: 'Live Hawaiian music and cultural entertainment evening at Grand Naniloa Hotel Hilo.',
  startDate: hst(2026, 4, 4, 15, 30),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/ekolulaulea-hilo-tickets-1982557420614',
  ageRange: 'all_ages',
  relevanceScore: 85,
  venueId: 'venue-grand-naniloa-hilo',
});

// 20. EKOLULAULE'A – Kona (Apr 3)
addEvent({
  id: eventId("EKOLULAULEA Kona", '2026-04-03'),
  title: "EKOLULAULE'A – Kona",
  description: 'Live Hawaiian music and cultural entertainment evening at KBXtreme Premier Entertainment Center.',
  startDate: hst(2026, 4, 3, 18, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/ekolulaulea-kona-tickets-1982556941180',
  ageRange: 'all_ages',
  relevanceScore: 85,
  venueId: 'venue-kbxtreme-kona',
});

// 21. TAVANA Live in Kona (Apr 3)
addEvent({
  id: eventId('TAVANA Live in Kona', '2026-04-03'),
  title: 'TAVANA Live in Kona',
  description: 'Live performance by Hawaiian-Tahitian recording artist Tavana.',
  startDate: hst(2026, 4, 3, 18, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/tavana-tickets-1983528756907',
  ageRange: 'all_ages',
  relevanceScore: 80,
  venueId: 'venue-willies-hot-chicken-kona',
});

// 22. Kona Reggae Festival (Apr 18)
addEvent({
  id: eventId('Kona Reggae Festival 2026', '2026-04-18'),
  title: 'Kona Reggae Festival 2026',
  description: 'Local reggae music festival featuring multiple artists in Kona.',
  startDate: hst(2026, 4, 18, 17, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/kona-reggae-festival-2026-tickets-1983649194138',
  ageRange: 'all_ages',
  relevanceScore: 78,
  venueId: 'venue-willies-hot-chicken-kona',
});

// 23. Kepi and Friends LIVE in Kona (Apr 12)
addEvent({
  id: eventId('Kepi and Friends LIVE in Kona', '2026-04-12'),
  title: 'Kepi and Friends LIVE in Kona',
  description: 'Live Hawaiian music show featuring Kepi (Grammy-recognized) and special guests.',
  startDate: hst(2026, 4, 12, 16, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/kepi-and-friends-live-in-kona-tickets-1982737542363',
  ageRange: 'all_ages',
  relevanceScore: 82,
  venueId: 'venue-kona-elks-lodge',
});

// 24. THE DICKIES Live in Kona (Apr 25)
addEvent({
  id: eventId('THE DICKIES Live in Kona', '2026-04-25'),
  title: 'THE DICKIES Live in Kona',
  description: 'Live punk rock show featuring LA punk legends The Dickies.',
  startDate: hst(2026, 4, 25, 18, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/the-dickies-live-in-kona-tickets-1983415817101',
  ageRange: 'all_ages',
  relevanceScore: 72,
  venueId: 'venue-kona-elks-lodge',
});

// 25. Artist 2 Artist: Henry Kapono with Jerry Santos (Apr 24)
addEvent({
  id: eventId('Artist 2 Artist Henry Kapono Jerry Santos', '2026-04-24'),
  title: 'Artist 2 Artist: Henry Kapono with Jerry Santos & Kamuela Kimokeo',
  description: 'Intimate performance conversation between legendary Hawaiian musicians Henry Kapono and Jerry Santos. A rare gathering of Hawaiian music royalty.',
  startDate: hst(2026, 4, 24, 18, 30),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/artist-2-artist-henry-kapono-with-jerry-santos-kamuela-kimokeo-tickets-1985774757756',
  ageRange: 'all_ages',
  relevanceScore: 88,
  venueId: 'venue-kona-sea-salt',
});

// 26. Big Island Jazz & Blues Festival (May 14-17)
addEvent({
  id: eventId('13th Annual Big Island Jazz Blues Festival', '2026-05-14'),
  title: '13th Annual Big Island Jazz & Blues Festival',
  description: 'Grammy Award-winning artists, jazz legends and blues greats perform oceanfront at Mauna Kea Beach Hotel. Sunset backdrop, intimate setting. Main concert Sat May 16.',
  startDate: hst(2026, 5, 14, 16, 30),
  endDate: hst(2026, 5, 17, 22, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.bigislandjazzandbluesfestival.com/',
  ageRange: 'all_ages',
  relevanceScore: 88,
  venueId: 'venue-mauna-kea-beach-hotel',
});

// 27. Foodies + New Friends Hilo – Apr 4
addEvent({
  id: eventId('Foodies New Friends Hilo Apr', '2026-04-04'),
  title: 'Foodies + New Friends Hilo – Entrepreneurs Giving Back (April)',
  description: 'Monthly food social mixer. Meet local entrepreneurs, eat great local food, support community.',
  startDate: hst(2026, 4, 4, 19, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/foodies-new-friends-hilo-entrepreneurs-giving-back-edition-tickets-1975241365095',
  ageRange: 'all_ages',
  relevanceScore: 72,
  venueId: 'venue-hilo-restaurant-social',
});

// 28. Foodies + New Friends Hilo – May 2
addEvent({
  id: eventId('Foodies New Friends Hilo May', '2026-05-02'),
  title: 'Foodies + New Friends Hilo – Entrepreneurs Giving Back (May)',
  description: 'Monthly food social mixer. Meet local entrepreneurs, eat great local food, support community.',
  startDate: hst(2026, 5, 2, 19, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/foodies-new-friends-hilo-entrepreneurs-giving-back-edition-tickets-1975241365095',
  ageRange: 'all_ages',
  relevanceScore: 72,
  venueId: 'venue-hilo-restaurant-social',
});

// 29-31. Gyotaku Printing Workshop – Apr 3, 10, 17
for (const day of [3, 10, 17]) {
  addEvent({
    id: eventId(`Gyotaku Printing Workshop Hilo Apr ${day}`, `2026-04-${day}`),
    title: `Gyotaku Printing Workshop – Hilo (Apr ${day})`,
    description: 'Traditional Japanese fish-print art technique. Hands-on workshop.',
    startDate: hst(2026, 4, day, 16, 0),
    isFree: false,
    cost: 'Paid',
    externalUrl: 'https://www.eventbrite.com/e/gyotaku-printing-hilo-tickets-1982743060869',
    ageRange: 'all_ages',
    relevanceScore: 82,
    venueId: 'venue-housmart-ben-franklin-hilo',
  });
}

// 32-33. Basic Hand Lettering Workshop – Apr 2, 16
for (const day of [2, 16]) {
  addEvent({
    id: eventId(`Basic Hand Lettering Workshop Hilo Apr ${day}`, `2026-04-${day}`),
    title: `Basic Hand Lettering Workshop – Hilo (Apr ${day})`,
    description: 'Hands-on basic hand lettering workshop. Supplies provided.',
    startDate: hst(2026, 4, day, 16, 0),
    isFree: false,
    cost: 'Paid',
    externalUrl: 'https://www.eventbrite.com/e/basic-hand-lettering-hilo-tickets-671814353817',
    ageRange: 'all_ages',
    relevanceScore: 80,
    venueId: 'venue-housmart-ben-franklin-hilo',
  });
}

// 34. MORU Hello Kitty Doll Workshop (Apr 8)
addEvent({
  id: eventId('MORU Hello Kitty Doll Workshop Hilo Apr 8', '2026-04-08'),
  title: 'MORU Hello Kitty Doll Workshop – Hilo',
  description: 'Craft workshop making a MORU Hello Kitty-themed doll.',
  startDate: hst(2026, 4, 8, 14, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/moru-hello-kitty-doll-hilo-tickets-1978506674724',
  ageRange: 'all_ages',
  relevanceScore: 78,
  venueId: 'venue-housmart-ben-franklin-hilo',
});

// 35-37. Three Straw Twisted Lei Workshop – Apr 9, 23; May 7
for (const [m, d] of [[4, 9], [4, 23], [5, 7]]) {
  addEvent({
    id: eventId(`Three Straw Twisted Lei Workshop Hilo ${m}-${d}`, `2026-0${m}-${String(d).padStart(2,'0')}`),
    title: `Three Straw Twisted Lei Workshop – Hilo (${m}/${d})`,
    description: 'Traditional Hawaiian three-strand twisted lei making class.',
    startDate: hst(2026, m, d, 14, 0),
    isFree: false,
    cost: 'Paid',
    externalUrl: 'https://www.eventbrite.com/e/three-straw-twisted-lei-hilo-tickets-1982847018810',
    ageRange: 'all_ages',
    relevanceScore: 82,
    venueId: 'venue-housmart-ben-franklin-hilo',
  });
}

// 38. 3D Clay Flower Workshop (Apr 11)
addEvent({
  id: eventId('3D Clay Flower Workshop Hilo Apr 11', '2026-04-11'),
  title: '3D Clay Flower Workshop – Hilo',
  description: 'Create a 3D clay flower sculpture in this guided arts workshop.',
  startDate: hst(2026, 4, 11, 16, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/3d-clay-flower-hilo-tickets-1982742329682',
  ageRange: 'all_ages',
  relevanceScore: 78,
  venueId: 'venue-housmart-ben-franklin-hilo',
});

// 39-40. Crochet Rattail Lei Workshop – Apr 6, 20
for (const day of [6, 20]) {
  addEvent({
    id: eventId(`Crochet Rattail Lei Workshop Hilo Apr ${day}`, `2026-04-${day}`),
    title: `Crochet Rattail Lei Workshop – Hilo (Apr ${day})`,
    description: 'Learn to make a traditional Hawaiian crochet rattail lei.',
    startDate: hst(2026, 4, day, 12, 0),
    isFree: false,
    cost: 'Paid',
    externalUrl: 'https://www.eventbrite.com/e/crochet-rattail-lei-hilo-tickets-1967850594100',
    ageRange: 'all_ages',
    relevanceScore: 80,
    venueId: 'venue-housmart-ben-franklin-hilo',
  });
}

// 41-43. Ribbon Flowers Workshop – Apr 14, 28; May 5
for (const [m, d] of [[4, 14], [4, 28], [5, 5]]) {
  addEvent({
    id: eventId(`Ribbon Flowers Workshop Hilo ${m}-${d}`, `2026-0${m}-${String(d).padStart(2,'0')}`),
    title: `Ribbon Flowers Workshop – Hilo (${m}/${d})`,
    description: 'Learn to make ribbon flower arrangements. Great for lei day prep or home decor.',
    startDate: hst(2026, m, d, 16, 0),
    isFree: false,
    cost: 'Paid',
    externalUrl: 'https://www.eventbrite.com/e/ribbon-flowers-hilo-tickets-1984247566887',
    ageRange: 'all_ages',
    relevanceScore: 78,
    venueId: 'venue-housmart-ben-franklin-hilo',
  });
}

// 44. Ribbon Mock Orange Lei Workshop – first Wednesday (Apr 1)
addEvent({
  id: eventId('Ribbon Mock Orange Lei Workshop Hilo Apr 1', '2026-04-01'),
  title: 'Ribbon Mock Orange Lei Workshop – Hilo (Recurring Wednesdays)',
  description: 'Learn to make ribbon mock orange lei — traditional Hawaiian craft. Recurring Wednesdays in Apr-May.',
  startDate: hst(2026, 4, 1, 16, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/ribbon-mock-orange-lei-hilo-tickets-1980792038308',
  ageRange: 'all_ages',
  relevanceScore: 78,
  venueId: 'venue-housmart-ben-franklin-hilo',
});

// 45-47. Cup & Canvas Painting Party – Apr 11, 22, 30
for (const day of [11, 22, 30]) {
  addEvent({
    id: eventId(`Cup Canvas Painting Party Holualoa Apr ${day}`, `2026-04-${day}`),
    title: `Cup & Canvas Painting Party – Holualoa (Apr ${day})`,
    description: 'Guided canvas painting with beverages in coffee-country setting. Great for friends or date nights.',
    startDate: hst(2026, 4, day, 10, 0),
    isFree: false,
    cost: 'Paid',
    externalUrl: 'https://www.eventbrite.com/e/copy-of-copy-of-cup-canvas-painting-party-tickets-1983587052270',
    ageRange: 'all_ages',
    relevanceScore: 74,
    venueId: 'venue-donkey-mill',
  });
}

// 48. DRAG BINGO – Autism Mom's of Kona (Apr 12)
addEvent({
  id: eventId('DRAG BINGO Autism Moms of Kona', '2026-04-12'),
  title: "DRAG BINGO – Autism Mom's of Kona",
  description: "Fun drag bingo fundraiser benefiting Autism Mom's of Kona. LGBTQ friendly venue.",
  startDate: hst(2026, 4, 12, 15, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/drag-bingo-autism-moms-of-kona-tickets-1985879393725',
  ageRange: 'all_ages',
  relevanceScore: 70,
  venueId: 'venue-alii-drive-kona',
});

// 49. DRAG BRUNCH – Sister Act Edition (Apr 26)
addEvent({
  id: eventId('DRAG BRUNCH Sister Act Edition Kona', '2026-04-26'),
  title: 'DRAG BRUNCH – Sister Act Edition',
  description: 'Fabulous drag brunch with Sister Act theme. Inclusive community event.',
  startDate: hst(2026, 4, 26, 11, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/drag-brunch-sister-act-edition-tickets-1985880044672',
  ageRange: 'all_ages',
  relevanceScore: 68,
  venueId: 'venue-alii-drive-kona',
});

// 50. Malama Pono Kohala Spring Tea (Apr 19)
addEvent({
  id: eventId('Malama Pono Kohala 2026 Spring Tea', '2026-04-19'),
  title: 'Malama Pono Kohala 2026 Spring Tea',
  description: 'Elegant spring fundraising tea supporting North Kohala community health. Historic Anna Ranch venue.',
  startDate: hst(2026, 4, 19, 11, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/malama-pono-kohala-2026-spring-tea-registration-1984951798262',
  ageRange: 'all_ages',
  relevanceScore: 72,
  venueId: 'venue-anna-ranch-waimea',
});

// 51. Bhakti & Aloha – Ram Dass Birthday (Apr 6)
addEvent({
  id: eventId('Bhakti Aloha Ram Dass Birthday Celebration', '2026-04-06'),
  title: 'Bhakti & Aloha – Ram Dass Birthday Celebration',
  description: "Devotional music, kirtan, and community celebration honoring Ram Dass's legacy.",
  startDate: hst(2026, 4, 6, 16, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/bhakti-aloha-ram-dass-birthday-celebration-tickets-1986034459531',
  ageRange: 'all_ages',
  relevanceScore: 70,
  venueId: 'venue-kona-cloud-forest',
});

// 52. North Kohala Charity Golf Tournament (Apr 18)
addEvent({
  id: eventId('9th Annual North Kohala Charity Golf Tournament', '2026-04-18'),
  title: '9th Annual North Kohala Charity Golf Tournament',
  description: '4-person scramble golf tournament benefiting North Kohala. $190/player includes green fee, cart, lunch.',
  startDate: hst(2026, 4, 18, 9, 0),
  isFree: false,
  cost: '$190/player',
  externalUrl: 'http://www.northkohala.org/golf',
  ageRange: 'all_ages',
  relevanceScore: 72,
  venueId: 'venue-hapuna-golf-course',
});

// 53. Race for the Reef 5K (Apr 25)
addEvent({
  id: eventId('4th Annual Race for the Reef 5K', '2026-04-25'),
  title: '4th Annual Race for the Reef 5K',
  description: 'Community fun run supporting reef conservation. All fitness levels. Marine science education booths.',
  startDate: hst(2026, 4, 25, 8, 0),
  isFree: false,
  cost: 'Paid (registration)',
  externalUrl: 'https://www.365HawaiiIslandCommunityFund.org',
  ageRange: 'family',
  relevanceScore: 82,
  venueId: 'venue-alii-drive-kona',
});

// 54. Hawaii Volcanoes Fee Free Day – Apr 19
addEvent({
  id: eventId('Hawaii Volcanoes Natl Park Fee Free Day Apr 19', '2026-04-19'),
  title: 'Hawaii Volcanoes Natl Park – Free Entry (National Park Week)',
  description: 'Free entry on National Park Week opening day. Explore lava landscapes, Halemaʻumaʻu Crater, ranger programs.',
  startDate: hst(2026, 4, 19, 7, 0),
  endDate: hst(2026, 4, 19, 20, 0),
  isFree: true,
  cost: 'Free (normally $35/vehicle)',
  externalUrl: 'https://www.nps.gov/havo',
  ageRange: 'family',
  relevanceScore: 92,
  venueId: 'venue-vac-gallery-havo',
});

// 55-56. Thriving in Hawaii Workshop – Apr 16, 23
for (const day of [16, 23]) {
  addEvent({
    id: eventId(`Thriving in Hawaii Smart Planning Financial Success Apr ${day}`, `2026-04-${day}`),
    title: `Thriving in Hawaii: Smart Planning for Financial Success (Apr ${day})`,
    description: 'Community financial planning workshop for living successfully in Hawaii.',
    startDate: hst(2026, 4, day, 17, 30),
    isFree: true,
    cost: 'Free / Low cost',
    externalUrl: 'https://www.eventbrite.com/e/thriving-in-hawaii-smart-planning-for-financial-success-tickets-1978677933965',
    ageRange: 'all_ages',
    relevanceScore: 70,
    venueId: 'venue-pukalani-waimea',
  });
}

// 57. Hilo Lei Day Festival 2026 (May 1)
addEvent({
  id: eventId('Hilo Lei Day Festival 2026', '2026-05-01'),
  title: 'Hilo Lei Day Festival 2026',
  description: "May Day is Lei Day! Free festival with hula halau, lei making demos, lei contest, guided forest tours, orchid and plant sales. No food trucks; bring chairs and snacks.",
  startDate: hst(2026, 5, 1, 10, 0),
  endDate: hst(2026, 5, 1, 14, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://www.leiday.org/',
  ageRange: 'family',
  relevanceScore: 94,
  venueId: 'venue-kalakaua-park-hilo',
});

// 58. Lei Day at Queen's Marketplace – Waikoloa (May 1)
addEvent({
  id: eventId("Lei Day at Queens Marketplace Waikoloa", '2026-05-01'),
  title: "Lei Day at Queen's Marketplace – Waikoloa",
  description: 'Celebrate Lei Day with live music, lei making, ukulele lessons, hula show, face painting, lawn games for keiki.',
  startDate: hst(2026, 5, 1, 10, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://www.queensmarketplace.com/events/annual-events/',
  ageRange: 'family',
  relevanceScore: 90,
  venueId: 'venue-queens-marketplace',
});

// 59. Kona Orchid Society Mother's Day Show & Sale (May 2)
addEvent({
  id: eventId("Kona Orchid Society Mothers Day Show Sale", '2026-05-02'),
  title: "Kona Orchid Society Mother's Day Show & Sale",
  description: 'Orchid display and sale. Orchids, cactus, succulents, air plants, bromeliads, crafts, jewelry, jams, food vendors.',
  startDate: hst(2026, 5, 2, 9, 0),
  endDate: hst(2026, 5, 2, 14, 0),
  isFree: false,
  cost: '$2 general / $20 Early Bird (8-9am)',
  externalUrl: 'https://konaorchidsociety.squarespace.com',
  ageRange: 'family',
  relevanceScore: 82,
  venueId: 'venue-makaeo-pavilion-kona',
});

// 60. She Talks Hawaii: Voices of Aloha (May 7)
addEvent({
  id: eventId('She Talks Hawaii Voices of Aloha', '2026-05-07'),
  title: "She Talks Hawaii: Voices of Aloha",
  description: "Women's conference celebrating Hawaiian voices — storytelling, leadership, community, culture.",
  startDate: hst(2026, 5, 7, 9, 0),
  isFree: false,
  cost: 'Check Eventbrite for pricing',
  externalUrl: 'https://www.eventbrite.com/e/she-talks-hawail-voices-of-aloha-tickets-1743891158399',
  ageRange: 'all_ages',
  relevanceScore: 78,
  venueId: 'venue-uh-hilo',
});

// 61. 5th Annual Hilo Chocolate Festival (May 9)
addEvent({
  id: eventId('5th Annual Hilo Chocolate Festival', '2026-05-09'),
  title: '5th Annual Hilo Chocolate Festival',
  description: 'All-local-cacao chocolate festival. Meet farmers and chocolate makers, tastings, silent auction, raffle.',
  startDate: hst(2026, 5, 9, 9, 0),
  endDate: hst(2026, 5, 9, 16, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.konaweb.com/calendar/',
  ageRange: 'all_ages',
  relevanceScore: 85,
  venueId: 'venue-hilo-hawaiian-hotel',
});

// 62. Honokaa Western Week – Block Party & Parade (May 16)
addEvent({
  id: eventId('Honokaa Western Week Block Party Parade', '2026-05-16'),
  title: 'Honokaa Western Week – Block Party & Parade',
  description: 'Massive paniolo-themed block party: road closure, food trucks, Western Week Parade, Talent Showdown, country music, line dancing.',
  startDate: hst(2026, 5, 16, 14, 0),
  endDate: hst(2026, 5, 16, 23, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://honokaawesternweek.org/events/',
  ageRange: 'family',
  relevanceScore: 88,
  venueId: 'venue-mamane-street-honokaa',
});

// 63. Honokaa Western Week – Paniolo Baking Showdown (May 17)
addEvent({
  id: eventId('Honokaa Western Week Hamakua Harvest Paniolo Baking Showdown', '2026-05-17'),
  title: 'Honokaa Western Week – Hamakua Harvest Paniolo Baking Showdown',
  description: 'Island bakers compete making coconut/banana desserts. Farmers Market with live entertainment.',
  startDate: hst(2026, 5, 17, 9, 0),
  endDate: hst(2026, 5, 17, 14, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://honokaawesternweek.org/events/',
  ageRange: 'family',
  relevanceScore: 85,
  venueId: 'venue-mamane-street-honokaa',
});

// 64. Honokaa Western Week – Portuguese Bean Soup Contest (May 19)
addEvent({
  id: eventId('Honokaa Western Week Portuguese Bean Soup Contest', '2026-05-19'),
  title: 'Honokaa Western Week – Portuguese Bean Soup Contest',
  description: 'Community cooks compete for best Portuguese bean soup. Taste-test, vote, country music. Classic tradition.',
  startDate: hst(2026, 5, 19, 15, 0),
  endDate: hst(2026, 5, 19, 17, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://honokaawesternweek.org/events/',
  ageRange: 'family',
  relevanceScore: 82,
  venueId: 'venue-mamane-street-honokaa',
});

// 65. Honokaa Western Week – Careers in Ranching (May 20)
addEvent({
  id: eventId('Honokaa Western Week Careers in Ranching', '2026-05-20'),
  title: 'Honokaa Western Week – Careers in Ranching',
  description: 'Presentation for kids and families about Hawaiian ranching. Generations of paniolo share their experiences.',
  startDate: hst(2026, 5, 20, 10, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://honokaawesternweek.org/events/',
  ageRange: 'family',
  relevanceScore: 86,
  venueId: 'venue-mamane-street-honokaa',
});

// 66. Honokaa Western Week – Vinha d'Alhos Dinner (May 21)
addEvent({
  id: eventId("Honokaa Western Week Vinha dAlhos Dinner", '2026-05-21'),
  title: "Honokaa Western Week – Vinha d'Alhos Dinner",
  description: "Traditional Portuguese pork dish (Vinha d'Alhos) served drive-thru or dine-in with country music.",
  startDate: hst(2026, 5, 21, 17, 30),
  endDate: hst(2026, 5, 21, 19, 30),
  isFree: false,
  cost: 'Low cost (meal price)',
  externalUrl: 'https://honokaawesternweek.org/events/',
  ageRange: 'family',
  relevanceScore: 78,
  venueId: 'venue-mamane-street-honokaa',
});

// 67. Honokaa Western Week – Country Line Dancing (May 23)
addEvent({
  id: eventId('Honokaa Western Week Country Line Dancing', '2026-05-23'),
  title: 'Honokaa Western Week – Country Line Dancing Event',
  description: 'Island-wide line dancing gathering with food trucks and vendors.',
  startDate: hst(2026, 5, 23, 17, 0),
  endDate: hst(2026, 5, 23, 21, 0),
  isFree: false,
  cost: 'Check event for pricing',
  externalUrl: 'https://honokaawesternweek.org/events/',
  ageRange: 'family',
  relevanceScore: 80,
  venueId: 'venue-honokaa-sports-complex',
});

// 68. Hawaii Saddle Club Scholarship Rodeo (May 24-25)
addEvent({
  id: eventId('Hawaii Saddle Club Scholarship Rodeo', '2026-05-24'),
  title: 'Hawaii Saddle Club Scholarship Rodeo',
  description: 'Annual paniolo rodeo — roping, riding, and competition. Real Hawaiian cowboy tradition.',
  startDate: hst(2026, 5, 24, 12, 0),
  endDate: hst(2026, 5, 25, 18, 0),
  isFree: false,
  cost: 'Paid (at gate)',
  externalUrl: 'https://honokaawesternweek.org/events/',
  ageRange: 'family',
  relevanceScore: 88,
  venueId: 'venue-rose-andrade-arena',
});

// 69. Big Island Film Festival (May 22-26)
addEvent({
  id: eventId('Big Island Film Festival 2026', '2026-05-22'),
  title: 'Big Island Film Festival 2026',
  description: 'International independent film festival. Outdoor screenings under stars, workshops, Golden Honu Awards.',
  startDate: hst(2026, 5, 22, 19, 0),
  endDate: hst(2026, 5, 26, 22, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'http://www.bigislandfilmfestival.com/',
  ageRange: 'all_ages',
  relevanceScore: 85,
  venueId: 'venue-waikoloa-film-festival',
});

// 70. Ka'u Coffee Festival (late May TBD)
addEvent({
  id: eventId("Kau Coffee Festival Late May 2026", '2026-05-25'),
  title: "Ka'u Coffee Festival 2026",
  description: "Multi-day celebration of Ka'u coffee. Tastings, recipe contest, brewing demos, music, hula, farm tours, crafts.",
  startDate: hst(2026, 5, 25, 9, 0),
  isFree: true,
  cost: 'Free (most events)',
  externalUrl: 'https://www.kaucoffeefestival.com/',
  ageRange: 'family',
  relevanceScore: 88,
  venueId: 'venue-pahala-kau',
});

// 71. MAMo: Maoli Arts Month (all May)
addEvent({
  id: eventId('MAMo Maoli Arts Month May 2026', '2026-05-01'),
  title: 'MAMo: Maoli Arts Month – May 2026',
  description: 'Month-long celebration of Native Hawaiian arts. Exhibits, art markets, cultural programs throughout the month. Various venues across Big Island.',
  startDate: hst(2026, 5, 1, 9, 0),
  endDate: hst(2026, 5, 31, 20, 0),
  isFree: true,
  cost: 'Various (many free)',
  externalUrl: 'https://www.facebook.com/MAMo-Maoli-Arts-Movement-120467331301327/',
  ageRange: 'all_ages',
  relevanceScore: 88,
  venueId: 'venue-east-hawaii-cultural',
});

// 72. Hawaii Kuauli Pacific & Asia Cultural Festival (May TBD)
addEvent({
  id: eventId('Hawaii Kuauli Pacific Asia Cultural Festival May 2026', '2026-05-15'),
  title: 'Hawaii Kuauli Pacific & Asia Cultural Festival',
  description: '3-day festival of Pacific and Asian cultures — dance, music, food, fashion, workshops.',
  startDate: hst(2026, 5, 15, 10, 0),
  isFree: false,
  cost: 'Various',
  externalUrl: 'https://www.hikuauli.com/',
  ageRange: 'family',
  relevanceScore: 85,
  venueId: 'venue-kbxtreme-kona',
});

// 73. Return to Radiance Hawaii Yoga Retreat (May 26-30)
addEvent({
  id: eventId('Return to Radiance Hawaii Yoga Retreat', '2026-05-26'),
  title: 'Return to Radiance Hawaii Yoga Retreat',
  description: 'Multi-day yoga and wellness retreat in Kona\'s cloud forest. Morning yoga, mindfulness, nature immersion.',
  startDate: hst(2026, 5, 26, 6, 0),
  endDate: hst(2026, 5, 30, 18, 0),
  isFree: false,
  cost: 'Paid (retreat fee)',
  externalUrl: 'https://www.eventbrite.com/e/return-to-radiance-hawaii-yoga-retreat-tickets-1985528935495',
  ageRange: 'all_ages',
  relevanceScore: 70,
  venueId: 'venue-kona-cloud-forest',
});

// 74. Women's Vocal Re-Wilding Weekend (May 29-31)
addEvent({
  id: eventId("Womens Vocal Re-Wilding Weekend Holualoa", '2026-05-29'),
  title: "Women's Vocal Re-Wilding Weekend",
  description: "Women's vocal arts and voice work weekend retreat in lush Holualoa setting.",
  startDate: hst(2026, 5, 29, 11, 0),
  endDate: hst(2026, 5, 31, 18, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/womens-vocal-re-wilding-weekend-tickets-1982603775262',
  ageRange: 'all_ages',
  relevanceScore: 68,
  venueId: 'venue-orchid-isle-manor',
});

// 75. Ironman 70.3 Hawaii (May 30)
addEvent({
  id: eventId('Ironman 70.3 Hawaii', '2026-05-30'),
  title: 'Ironman 70.3 Hawaii',
  description: 'World championship qualifying half-triathlon. 1.2 mi swim, 56 mi bike, 13.1 mi run. Spectators welcome free.',
  startDate: hst(2026, 5, 30, 6, 0),
  isFree: true,
  cost: 'Free to watch; athlete registration paid',
  externalUrl: 'https://www.ironman.com/im703-hawaii',
  ageRange: 'family',
  relevanceScore: 82,
  venueId: 'venue-kohala-coast-generic',
});

// 76. Free Entrance to HAVO – Memorial Day (May 25)
addEvent({
  id: eventId('Free Entrance Hawaii Volcanoes Natl Park Memorial Day', '2026-05-25'),
  title: "Hawaii Volcanoes Natl Park – Free Entry (Memorial Day)",
  description: 'Fee-free day for Memorial Day. Explore lava landscapes, ranger programs, visitor center.',
  startDate: hst(2026, 5, 25, 7, 0),
  endDate: hst(2026, 5, 25, 20, 0),
  isFree: true,
  cost: 'Free (normally $35/vehicle)',
  externalUrl: 'https://www.nps.gov/havo',
  ageRange: 'family',
  relevanceScore: 93,
  venueId: 'venue-vac-gallery-havo',
});

// 77. The May Chocolate Club (May 23)
addEvent({
  id: eventId('The May Chocolate Club Saturday Vibes Big Island Vanilla', '2026-05-23'),
  title: 'The May Chocolate Club – Saturday Vibes',
  description: 'Chocolate club gathering at Big Island Vanilla farm. Tastings, community, farm setting.',
  startDate: hst(2026, 5, 23, 11, 0),
  isFree: false,
  cost: 'Paid',
  externalUrl: 'https://www.eventbrite.com/e/the-may-chocolate-club-saturday-vibes-tickets-1983753972533',
  ageRange: 'all_ages',
  relevanceScore: 80,
  venueId: 'venue-big-island-vanilla',
});

// 78. 4-Day Lomilomi Intensive Training (May 19-22)
addEvent({
  id: eventId('4-Day Lomilomi Intensive Training Pahoa', '2026-05-19'),
  title: '4-Day Lomilomi Intensive Training',
  description: "4-day traditional Hawaiian lomilomi massage training. Cultural immersion in ancient healing arts.",
  startDate: hst(2026, 5, 19, 9, 30),
  endDate: hst(2026, 5, 22, 17, 0),
  isFree: false,
  cost: 'Paid (training fee)',
  externalUrl: 'https://www.eventbrite.com/e/4-day-lomilomi-intensive-training-tickets-1981407589438',
  ageRange: 'all_ages',
  relevanceScore: 74,
  venueId: 'venue-halau-uhane-pahoa',
});

// 79. Kokua Kailua Village Stroll – April
addEvent({
  id: eventId('Kokua Kailua Village Stroll April', '2026-04-19'),
  title: "Kokua Kailua Village Stroll – April Edition",
  description: "Monthly community marketplace on Ali'i Drive. 100+ artisan/craft vendors, live music, island food, dog-friendly.",
  startDate: hst(2026, 4, 19, 13, 0),
  endDate: hst(2026, 4, 19, 18, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://www.konaweb.com/calendar/',
  ageRange: 'family',
  relevanceScore: 88,
  venueId: 'venue-alii-drive-kona',
});

// 80. Kokua Kailua Village Stroll – May
addEvent({
  id: eventId('Kokua Kailua Village Stroll May', '2026-05-17'),
  title: "Kokua Kailua Village Stroll – May Edition",
  description: "Monthly community marketplace on Ali'i Drive. 100+ artisan/craft vendors, live music, island food, dog-friendly.",
  startDate: hst(2026, 5, 17, 13, 0),
  endDate: hst(2026, 5, 17, 18, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://www.konaweb.com/calendar/',
  ageRange: 'family',
  relevanceScore: 88,
  venueId: 'venue-alii-drive-kona',
});

// 81. King Kamehameha Cultural Historical Tour – Thursdays
addEvent({
  id: eventId('King Kamehameha Cultural Historical Tour Kona Thu Apr 2', '2026-04-02'),
  title: 'King Kamehameha Cultural Historical Tour – Kona (Recurring Thursdays)',
  description: 'Free weekly walking tour exploring cultural and historical legacy of King Kamehameha in historic downtown Kona. Every Thursday Apr-May, 9:30-10:30am.',
  startDate: hst(2026, 4, 2, 9, 30),
  endDate: hst(2026, 4, 2, 10, 30),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://bigislandnow.com/events/',
  ageRange: 'family',
  relevanceScore: 88,
  venueId: 'venue-alii-drive-kona',
});

// 82. Queens' Culinary Market – Waikoloa Thursdays
addEvent({
  id: eventId("The Queens Culinary Market Waikoloa Thu Apr 2", '2026-04-02'),
  title: "The Queens' Culinary Market – Waikoloa (Recurring Thursdays)",
  description: 'Weekly culinary and arts market. Food, crafts, live music, keiki activities. Free admission. Every Thursday Apr-May, 4-7pm.',
  startDate: hst(2026, 4, 2, 16, 0),
  endDate: hst(2026, 4, 2, 19, 0),
  isFree: true,
  cost: 'Free',
  externalUrl: 'https://bigislandnow.com/events/',
  ageRange: 'family',
  relevanceScore: 86,
  venueId: 'venue-queens-marketplace',
});

// 83. Yoga on the Beach – Thursdays
addEvent({
  id: eventId("Yoga on the Beach Calley ONeill Thu Apr 2", '2026-04-02'),
  title: 'Yoga on the Beach with Calley O\'Neill (Recurring Thursdays)',
  description: "Outdoor beach yoga. All levels welcome. Iconic A-Bay setting. Every Thursday Apr-May, 8-9:30am.",
  startDate: hst(2026, 4, 2, 8, 0),
  endDate: hst(2026, 4, 2, 9, 30),
  isFree: false,
  cost: 'Check BigIslandNow for pricing',
  externalUrl: 'https://bigislandnow.com/events/',
  ageRange: 'all_ages',
  relevanceScore: 78,
  venueId: 'venue-lava-lava-beach-club',
});

// 84. Feast & Fire Luau – Thursdays
addEvent({
  id: eventId("Feast Fire Luau Outrigger Kona Thu Apr 2", '2026-04-02'),
  title: "Feast & Fire Luau – Outrigger Kona (Recurring Thursdays)",
  description: 'Traditional Hawaiian luau with fire dancing, hula, live music, authentic island cuisine. Every Thursday Apr-May, 5:30-7:30pm.',
  startDate: hst(2026, 4, 2, 17, 30),
  endDate: hst(2026, 4, 2, 19, 30),
  isFree: false,
  cost: 'Paid (luau ticket)',
  externalUrl: 'https://bigislandnow.com/events/',
  ageRange: 'family',
  relevanceScore: 85,
  venueId: 'venue-outrigger-kona',
});

// ─── SEED FUNCTIONS ───────────────────────────────────────────────────────────

async function seedNewVenues() {
  console.log(`Seeding ${NEW_VENUES.length} new venues...`);
  const { error } = await supabase
    .from('venues')
    .upsert(NEW_VENUES, { onConflict: 'id', ignoreDuplicates: false });
  if (error) {
    console.error('Venue seed failed:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
  console.log(`  ${NEW_VENUES.length} new venues upserted OK`);
  return NEW_VENUES.length;
}

async function seedEvents() {
  console.log(`\nSeeding ${EVENTS.length} CSV Hawaii events...`);

  const BATCH_SIZE = 50;
  let totalInserted = 0;

  for (let i = 0; i < EVENTS.length; i += BATCH_SIZE) {
    const batch = EVENTS.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('events')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, JSON.stringify(error, null, 2));
      process.exit(1);
    }
    totalInserted += batch.length;
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} events OK`);
  }

  console.log(`\n${totalInserted} CSV Hawaii events upserted`);
  return totalInserted;
}

async function verify() {
  console.log('\nVerifying...');
  const { count } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'hawaii-manual');
  console.log(`Total hawaii-manual events in DB: ${count}`);
}

async function main() {
  console.log('HOMEGROWN — HAWAII CSV SEED (Apr-May 2026)');
  console.log('==========================================\n');

  const venueCount = await seedNewVenues();
  const eventCount = await seedEvents();
  await verify();

  console.log('\nSEED COMPLETE!');
  console.log(`  New venues: ${venueCount}`);
  console.log(`  Events seeded from CSV: ${eventCount}`);
}

main().catch(console.error);
