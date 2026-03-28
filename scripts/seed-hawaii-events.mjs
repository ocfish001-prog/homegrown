/**
 * Seed Supabase with real Hawaii Big Island events (April-May 2026).
 * Replaces the 8 SF placeholder events with authentic local data.
 * Run: node scripts/seed-hawaii-events.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbzxfwlgldrobubcssoa.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indienhmd2xnbGRyb2J1YmNzc29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5Njc3NiwiZXhwIjoyMDkwMDcyNzc2fQ.a6Ghoy_6ybrR4TLsG3ZMAZPhQ1jxtu3RTl8zJxPseP4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function d(month, day, hour, minute) {
  hour = hour || 0;
  minute = minute || 0;
  return new Date(2026, month - 1, day, hour, minute, 0).toISOString();
}

const NOW = new Date().toISOString();

const VENUES = [
  {
    id: 'venue-hilo-palace-theater',
    name: 'Hilo Palace Theater',
    address: '38 Haili St',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7288,
    lng: -155.0862,
  },
  {
    id: 'venue-afook-chinen',
    name: 'Afook-Chinen Civic Auditorium',
    address: '25 Aupuni St',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7295,
    lng: -155.087,
  },
  {
    id: 'venue-kbxtreme-kona',
    name: 'KBXtreme Premier Entertainment Center',
    address: '74-5620 Palani Rd',
    city: 'Kailua-Kona',
    state: 'HI',
    zip: '96740',
    lat: 19.6409,
    lng: -155.9969,
  },
  {
    id: 'venue-grand-naniloa-hilo',
    name: 'Grand Naniloa Hotel Golf Course',
    address: '93 Banyan Dr',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7219,
    lng: -155.0662,
  },
  {
    id: 'venue-imiloa-astronomy',
    name: 'Imiloa Astronomy Center',
    address: '600 Imiloa Pl',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7013,
    lng: -155.0858,
  },
  {
    id: 'venue-scp-hilo-hotel',
    name: 'SCP Hilo Hotel',
    address: '31 Banyan Dr',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7224,
    lng: -155.0677,
  },
  {
    id: 'venue-vac-gallery-havo',
    name: 'Volcano Art Center Gallery (HAVO)',
    address: 'Hawaii Volcanoes National Park, Crater Rim Dr',
    city: 'Volcano',
    state: 'HI',
    zip: '96785',
    lat: 19.4297,
    lng: -155.2579,
  },
  {
    id: 'venue-vac-niaulani',
    name: 'VAC Niaulani Campus',
    address: 'Old Volcano Rd',
    city: 'Volcano Village',
    state: 'HI',
    zip: '96785',
    lat: 19.4259,
    lng: -155.236,
  },
  {
    id: 'venue-kawamoto-pool',
    name: 'Kawamoto Pool',
    address: '260 Kalanikoa St',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7258,
    lng: -155.0924,
  },
  {
    id: 'venue-waikoloa-beach-drive',
    name: 'Waikoloa Beach Drive',
    address: 'Waikoloa Beach Dr',
    city: 'Waikoloa',
    state: 'HI',
    zip: '96738',
    lat: 19.9219,
    lng: -155.8866,
  },
  {
    id: 'venue-downtown-hilo',
    name: 'Downtown Hilo Farmers Market',
    address: 'Mamo St & Kamehameha Ave',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.729,
    lng: -155.0906,
  },
  {
    id: 'venue-pukalani-waimea',
    name: 'Pukalani Stables - Midweek Market',
    address: '67-1419 Mamalahoa Hwy',
    city: 'Waimea',
    state: 'HI',
    zip: '96743',
    lat: 20.0181,
    lng: -155.6714,
  },
  {
    id: 'venue-donkey-mill',
    name: 'Donkey Mill Art Center',
    address: '78-6670 Mamalahoa Hwy',
    city: 'Holualoa',
    state: 'HI',
    zip: '96725',
    lat: 19.6255,
    lng: -155.9592,
  },
  {
    id: 'venue-east-hawaii-cultural',
    name: 'East Hawaii Cultural Center',
    address: '141 Kalakaua St',
    city: 'Hilo',
    state: 'HI',
    zip: '96720',
    lat: 19.7302,
    lng: -155.0853,
  },
];

const APR_WEDNESDAYS = [1, 8, 15, 22, 29];
const MAY_WEDNESDAYS = [6, 13, 20];
const APR_FRIDAYS = [3, 10, 17, 24];
const MAY_FRIDAYS = [1, 8, 15];
const APR_MONDAYS = [6, 13, 20, 27];
const MAY_MONDAYS = [4, 11];
const APR_SATURDAYS = [4, 11, 18, 25];
const MAY_SATURDAYS = [2, 9];

const EVENTS = [];

// MEGA EVENTS

EVENTS.push({
  id: 'hawaii-merrie-monarch-2026',
  source: 'hawaii-manual',
  title: 'Merrie Monarch Festival 2026 - 63rd Annual',
  description: `The world's most prestigious hula competition returns to Hilo for its 63rd year. Featuring hula kahiko (ancient) and hula auana (modern) competitions, the beloved King Kamehameha Parade through downtown Hilo, and the free Hawaiian Arts Fair. One of the most culturally significant events in all of Hawaii - a must-see for homeschool families learning about Hawaiian culture.`,
  startDate: d(4, 7, 18, 0),
  endDate: d(4, 11, 22, 0),
  isFree: false,
  cost: `Parade & Hawaiian Arts Fair FREE. Competition tickets vary (book early - sell out fast)`,
  externalUrl: 'https://merriemonarch.com',
  ageRange: 'all_ages',
  relevanceScore: 99,
  isApproved: true,
  venueId: 'venue-afook-chinen',
  updatedAt: NOW,
});

EVENTS.push({
  id: 'hawaii-hilo-aloha-festival-2026',
  source: 'hawaii-manual',
  title: 'Hilo Aloha Cultural Festival 2026',
  description: `A week-long celebration of Hawaiian culture at the Hilo Palace Theater. Highlights include a FREE screening of Moana 2 in the Hawaiian language (Olelo Hawaii), cultural workshops, and community performances. Perfect for homeschool families wanting deep cultural immersion - from language to art to storytelling.`,
  startDate: d(4, 5, 10, 0),
  endDate: d(4, 12, 20, 0),
  isFree: true,
  cost: 'FREE (select events)',
  externalUrl: 'https://hiloaloha.actionsofaloha.com',
  ageRange: 'all_ages',
  relevanceScore: 97,
  isApproved: true,
  venueId: 'venue-hilo-palace-theater',
  updatedAt: NOW,
});

// THEATER & PERFORMING ARTS

EVENTS.push({
  id: 'hawaii-dia-movie-hop-apr1',
  source: 'hawaii-manual',
  title: 'DIA Movie Night: Hop - FREE Family Film',
  description: `Free family movie night screening of Hop at Hilo Palace Theater! RSVP to get free popcorn and a hot dog for your keiki. Perfect for young families looking for a fun, free Wednesday night activity. RSVP required for the free food - bring the whole ohana!`,
  startDate: d(4, 1, 18, 0),
  endDate: d(4, 1, 20, 0),
  isFree: true,
  cost: 'FREE (free popcorn + hot dog with RSVP)',
  externalUrl: 'https://www.hilopalacetheater.com',
  ageRange: 'family',
  relevanceScore: 90,
  isApproved: true,
  venueId: 'venue-hilo-palace-theater',
  updatedAt: NOW,
});

EVENTS.push({
  id: 'hawaii-na-leo-kaulana-apr4',
  source: 'hawaii-manual',
  title: 'Na Leo Kaulana Hawaiian Music Concert',
  description: `An evening of beautiful traditional Hawaiian music at the historic Hilo Palace Theater. Na Leo Kaulana brings the spirit of aloha to life through authentic Hawaiian songs and melodies. A wonderful cultural experience for the whole family and an excellent introduction to Hawaiian musical heritage for homeschool students.`,
  startDate: d(4, 4, 19, 0),
  endDate: d(4, 4, 21, 30),
  isFree: false,
  cost: 'Tickets required (check venue for pricing)',
  externalUrl: 'https://www.hilopalacetheater.com',
  ageRange: 'all_ages',
  relevanceScore: 82,
  isApproved: true,
  venueId: 'venue-hilo-palace-theater',
  updatedAt: NOW,
});

EVENTS.push({
  id: 'hawaii-ekolulaule-kona-apr3',
  source: 'hawaii-manual',
  title: "EKOLULAULE'A - Kona Family Night",
  description: `A vibrant Hawaiian cultural celebration and family night at KBXtreme in Kailua-Kona! Enjoy an evening of music, dance, food, and aloha spirit from 6PM to 11PM. Children 8 & under get in FREE. A fantastic community event bringing together families across the Kona coast for cultural celebration and fun.`,
  startDate: d(4, 3, 18, 0),
  endDate: d(4, 3, 23, 0),
  isFree: false,
  cost: 'Kids 8 & under FREE; ticketed for adults',
  externalUrl: 'https://www.kbxtreme.com',
  ageRange: 'family',
  relevanceScore: 88,
  isApproved: true,
  venueId: 'venue-kbxtreme-kona',
  updatedAt: NOW,
});

EVENTS.push({
  id: 'hawaii-ekolulaule-hilo-apr4',
  source: 'hawaii-manual',
  title: "EKOLULAULE'A - Hilo Family Afternoon & Evening",
  description: `A lively Hawaiian cultural celebration on the beautiful grounds of the Grand Naniloa Hotel Golf Course along Banyan Drive. Starting in the afternoon and going through the evening, enjoy live Hawaiian music, dance performances, local food, and community vibes. Children 8 & under FREE. Gorgeous bayfront setting makes this a perfect family outing.`,
  startDate: d(4, 4, 15, 30),
  endDate: d(4, 4, 21, 30),
  isFree: false,
  cost: 'Kids 8 & under FREE; ticketed for adults',
  externalUrl: 'https://www.grandnaniloa.com',
  ageRange: 'family',
  relevanceScore: 88,
  isApproved: true,
  venueId: 'venue-grand-naniloa-hilo',
  updatedAt: NOW,
});

const kikiShowings = [[4, 26], [4, 28], [4, 29], [5, 2], [5, 3]];
kikiShowings.forEach(function(pair) {
  const m = pair[0];
  const day = pair[1];
  EVENTS.push({
    id: 'hawaii-kikis-delivery-' + m + '-' + day,
    source: 'hawaii-manual',
    title: "Kiki's Delivery Service - Studio Ghibli Screening",
    description: `Experience the beloved Studio Ghibli classic on the big screen at Hilo Palace Theater! Kiki's Delivery Service follows a young witch-in-training as she finds her independence in a new city - a timeless story of perseverance, friendship, and growing up. Perfect for homeschool families studying Japanese culture, animation art, or just looking for a magical movie experience.`,
    startDate: d(m, day, 19, 0),
    endDate: d(m, day, 21, 0),
    isFree: false,
    cost: 'Tickets required (check venue for pricing)',
    externalUrl: 'https://www.hilopalacetheater.com',
    ageRange: 'family',
    relevanceScore: 85,
    isApproved: true,
    venueId: 'venue-hilo-palace-theater',
    updatedAt: NOW,
  });
});

EVENTS.push({
  id: 'hawaii-the-witches-apr14',
  source: 'hawaii-manual',
  title: "The Witches - Live Theater Production",
  description: `Live theatrical performance of Roald Dahl's classic tale at the Hilo Palace Theater. A delightfully spooky story of a young boy who stumbles into a secret convention of real witches. Great for older kids and families who love imaginative storytelling and live performance.`,
  startDate: d(4, 14, 19, 0),
  endDate: d(4, 14, 21, 30),
  isFree: false,
  cost: 'Tickets required (check venue for pricing)',
  externalUrl: 'https://www.hilopalacetheater.com',
  ageRange: 'family',
  relevanceScore: 80,
  isApproved: true,
  venueId: 'venue-hilo-palace-theater',
  updatedAt: NOW,
});

EVENTS.push({
  id: 'hawaii-youth-poet-laureate-apr16',
  source: 'hawaii-manual',
  title: "Hawaii State Youth Poet Laureate Showcase - FREE",
  description: `FREE showcase featuring Hawaii's most talented young poets! The Youth Poet Laureate program celebrates the voices of young people across the islands through spoken word and written poetry. A powerful and inspiring event - especially meaningful for homeschool families focusing on language arts, literature, and creative expression. No tickets needed.`,
  startDate: d(4, 16, 10, 0),
  endDate: d(4, 16, 12, 0),
  isFree: true,
  cost: 'FREE',
  externalUrl: 'https://www.hilopalacetheater.com',
  ageRange: 'all_ages',
  relevanceScore: 88,
  isApproved: true,
  venueId: 'venue-hilo-palace-theater',
  updatedAt: NOW,
});

EVENTS.push({
  id: 'hawaii-frozen-musical-auditions',
  source: 'hawaii-manual',
  title: 'Frozen The Musical - Community Auditions',
  description: `Auditions for the community production of Frozen The Musical at Hilo Palace Theater! The show runs in June 2026. Open to performers of all ages - a wonderful opportunity for children and teens who love musical theater. Check the Palace Theater for show dates to see the final production.`,
  startDate: d(3, 30, 10, 0),
  endDate: d(3, 31, 17, 0),
  isFree: true,
  cost: 'FREE to audition',
  externalUrl: 'https://www.hilopalacetheater.com',
  ageRange: 'all_ages',
  relevanceScore: 78,
  isApproved: true,
  venueId: 'venue-hilo-palace-theater',
  updatedAt: NOW,
});

// SCIENCE & EDUCATION

EVENTS.push({
  id: 'hawaii-imiloa-halau-okupu-apr20',
  source: 'hawaii-manual',
  title: 'Imiloa Halau Okupu - Native Plant Cultural Workshop',
  description: `Hands-on cultural and botanical workshop at the stunning Imiloa Astronomy Center. Halau Okupu blends Hawaiian cultural knowledge with native plant science - participants learn traditional uses of native Hawaiian plants, propagation techniques, and the deep connection between Hawaiian culture and the natural world. $20 for Imiloa members, $30 general admission.`,
  startDate: d(4, 20, 9, 0),
  endDate: d(4, 20, 11, 0),
  isFree: false,
  cost: '$20 members / $30 general',
  externalUrl: 'https://www.imiloahawaii.org',
  ageRange: 'family',
  relevanceScore: 92,
  isApproved: true,
  venueId: 'venue-imiloa-astronomy',
  updatedAt: NOW,
});

EVENTS.push({
  id: 'hawaii-e-olelo-workshop-apr8',
  source: 'hawaii-manual',
  title: "E Olelo Hawaii Kakou - FREE Hawaiian Language Workshop",
  description: `FREE beginner Hawaiian language (Olelo Hawaii) workshop! "E Olelo Hawaii Kakou" means "Let's speak Hawaiian together" - and that is exactly what you will do. No prior experience needed. Learn basic greetings, common phrases, and the beauty of this endangered Polynesian language. Perfect for homeschool families making Hawaiian language part of their curriculum.`,
  startDate: d(4, 8, 10, 0),
  endDate: d(4, 8, 12, 0),
  isFree: true,
  cost: 'FREE',
  externalUrl: 'https://www.scphilo.com',
  ageRange: 'all_ages',
  relevanceScore: 93,
  isApproved: true,
  venueId: 'venue-scp-hilo-hotel',
  updatedAt: NOW,
});

// RECURRING FREE EVENTS

const vacFridayDates = APR_FRIDAYS.map(function(day) { return [4, day]; })
  .concat(MAY_FRIDAYS.map(function(day) { return [5, day]; }));

vacFridayDates.forEach(function(pair) {
  const m = pair[0];
  const day = pair[1];
  EVENTS.push({
    id: 'hawaii-vac-aloha-friday-' + m + '-' + String(day).padStart(2, '0'),
    source: 'hawaii-manual',
    title: 'Volcano Art Center - Aloha Friday Cultural Activities',
    description: `FREE weekly cultural activities every Friday at the Volcano Art Center Gallery inside Hawaii Volcanoes National Park. Demonstrations, crafts, and hands-on cultural learning set against the otherworldly volcanic landscape of HAVO. NPS entrance fee applies to enter the park, but the VAC activities themselves are FREE. One of the best recurring family cultural experiences on the island.`,
    startDate: d(m, day, 11, 0),
    endDate: d(m, day, 13, 0),
    isFree: true,
    cost: 'FREE (NPS park entrance fee applies)',
    externalUrl: 'https://www.volcanoartcenter.org',
    ageRange: 'all_ages',
    relevanceScore: 88,
    isApproved: true,
    venueId: 'venue-vac-gallery-havo',
    updatedAt: NOW,
  });
});

const vacMondayDates = APR_MONDAYS.map(function(day) { return [4, day]; })
  .concat(MAY_MONDAYS.map(function(day) { return [5, day]; }));

vacMondayDates.forEach(function(pair) {
  const m = pair[0];
  const day = pair[1];
  EVENTS.push({
    id: 'hawaii-vac-forest-tour-' + m + '-' + String(day).padStart(2, '0'),
    source: 'hawaii-manual',
    title: 'Volcano Art Center - FREE Ohia Forest Nature Tour',
    description: `FREE guided nature walk every Monday through the native ohia lehua forest at VAC's Niaulani Campus in Volcano Village. Learn about native Hawaiian plants, forest ecology, and the cultural significance of the forest to Hawaiian people. A peaceful, educational outing perfect for nature-focused homeschool curriculum. No NPS entrance fee required - this is at the separate Niaulani Campus in Volcano Village.`,
    startDate: d(m, day, 9, 30),
    endDate: d(m, day, 11, 0),
    isFree: true,
    cost: 'FREE',
    externalUrl: 'https://www.volcanoartcenter.org/niaulani',
    ageRange: 'all_ages',
    relevanceScore: 87,
    isApproved: true,
    venueId: 'venue-vac-niaulani',
    updatedAt: NOW,
  });
});

const divingWedDates = APR_WEDNESDAYS.map(function(day) { return [4, day]; })
  .concat(MAY_WEDNESDAYS.map(function(day) { return [5, day]; }));

divingWedDates.forEach(function(pair) {
  const m = pair[0];
  const day = pair[1];
  EVENTS.push({
    id: 'hawaii-springboard-diving-' + m + '-' + String(day).padStart(2, '0'),
    source: 'hawaii-manual',
    title: 'Springboard Diving Club - FREE Weekly Practice',
    description: `FREE weekly springboard diving practice open to all ages at Kawamoto Pool in Hilo! Learn the basics of springboard diving or refine your skills in a supportive, community-run club environment. All skill levels welcome - from first-timers to experienced divers. A fantastic free physical education option for homeschool families.`,
    startDate: d(m, day, 14, 30),
    endDate: d(m, day, 16, 0),
    isFree: true,
    cost: 'FREE',
    externalUrl: 'https://www.hawaiicounty.gov/departments/parks-and-recreation',
    ageRange: 'all_ages',
    relevanceScore: 85,
    isApproved: true,
    venueId: 'venue-kawamoto-pool',
    updatedAt: NOW,
  });
});

const jazzWedDates = APR_WEDNESDAYS.map(function(day) { return [4, day]; })
  .concat(MAY_WEDNESDAYS.map(function(day) { return [5, day]; }));

jazzWedDates.forEach(function(pair) {
  const m = pair[0];
  const day = pair[1];
  EVENTS.push({
    id: 'hawaii-jazz-at-manta-' + m + '-' + String(day).padStart(2, '0'),
    source: 'hawaii-manual',
    title: 'Jazz at Manta - FREE Live Music Wednesday',
    description: `FREE live jazz every Wednesday evening along beautiful Waikoloa Beach Drive. Enjoy world-class live music in an open-air setting with ocean views - one of the best free weekly events on the island. Great for families who want to expose their kids to jazz and live music in a relaxed, outdoor environment.`,
    startDate: d(m, day, 18, 0),
    endDate: d(m, day, 21, 0),
    isFree: true,
    cost: 'FREE',
    externalUrl: 'https://www.mantaresort.com',
    ageRange: 'all_ages',
    relevanceScore: 84,
    isApproved: true,
    venueId: 'venue-waikoloa-beach-drive',
    updatedAt: NOW,
  });
});

const ukuleleWedDates = APR_WEDNESDAYS.map(function(day) { return [4, day]; })
  .concat(MAY_WEDNESDAYS.map(function(day) { return [5, day]; }));

ukuleleWedDates.forEach(function(pair) {
  const m = pair[0];
  const day = pair[1];
  EVENTS.push({
    id: 'hawaii-ukulele-lessons-' + m + '-' + String(day).padStart(2, '0'),
    source: 'hawaii-manual',
    title: 'FREE Ukulele Lessons - Waikoloa',
    description: `FREE community ukulele lessons every Wednesday evening at Waikoloa Beach Drive. Learn to play the iconic Hawaiian ukulele in a fun, relaxed group setting. No instrument required - just show up! Perfect for beginners of all ages. A wonderful way to connect with Hawaiian musical culture while developing a lifelong skill.`,
    startDate: d(m, day, 18, 0),
    endDate: d(m, day, 19, 0),
    isFree: true,
    cost: 'FREE',
    externalUrl: 'https://www.waikoloabeachresort.com',
    ageRange: 'all_ages',
    relevanceScore: 86,
    isApproved: true,
    venueId: 'venue-waikoloa-beach-drive',
    updatedAt: NOW,
  });
});

const hiloFarmersMarketDates = APR_WEDNESDAYS.map(function(day) { return [4, day]; })
  .concat(MAY_WEDNESDAYS.map(function(day) { return [5, day]; }))
  .concat(APR_SATURDAYS.map(function(day) { return [4, day]; }))
  .concat(MAY_SATURDAYS.map(function(day) { return [5, day]; }));

hiloFarmersMarketDates.forEach(function(pair) {
  const m = pair[0];
  const day = pair[1];
  const dt = new Date(2026, m - 1, day);
  const isWed = dt.getDay() === 3;
  const label = isWed ? 'Wednesday' : 'Saturday';
  EVENTS.push({
    id: 'hawaii-hilo-farmers-market-' + m + '-' + String(day).padStart(2, '0'),
    source: 'hawaii-manual',
    title: 'Hilo Farmers Market - ' + label,
    description: `One of the most vibrant farmers markets in all of Hawaii! The Hilo Farmers Market overflows with tropical fruits, flowers, local crafts, prepared foods, and the warmth of Big Island community. Wednesday markets are smaller and more local; Saturday markets are the big show. A beloved weekly tradition and a living lesson in local agriculture, culture, and commerce for homeschool families.`,
    startDate: d(m, day, 7, 0),
    endDate: d(m, day, 16, 0),
    isFree: true,
    cost: 'FREE to browse (shop as you wish)',
    externalUrl: 'https://hilofarmersmarket.com',
    ageRange: 'all_ages',
    relevanceScore: 86,
    isApproved: true,
    venueId: 'venue-downtown-hilo',
    updatedAt: NOW,
  });
});

const pukalaniWedDates = APR_WEDNESDAYS.map(function(day) { return [4, day]; })
  .concat(MAY_WEDNESDAYS.map(function(day) { return [5, day]; }));

pukalaniWedDates.forEach(function(pair) {
  const m = pair[0];
  const day = pair[1];
  EVENTS.push({
    id: 'hawaii-pukalani-market-' + m + '-' + String(day).padStart(2, '0'),
    source: 'hawaii-manual',
    title: 'Pukalani Midweek Market - Waimea',
    description: `The beloved Pukalani Midweek Market in cool Waimea (Kamuela) - a small-town farmers and artisan market experience. Fresh produce, local crafts, hot food, and the friendly community spirit of upcountry Waimea. Runs every Wednesday morning through early afternoon. A perfect morning outing if you are exploring the upcountry region of the Big Island.`,
    startDate: d(m, day, 8, 30),
    endDate: d(m, day, 13, 0),
    isFree: true,
    cost: 'FREE to browse',
    externalUrl: 'https://www.facebook.com/pukalanistables',
    ageRange: 'all_ages',
    relevanceScore: 80,
    isApproved: true,
    venueId: 'venue-pukalani-waimea',
    updatedAt: NOW,
  });
});

// ART & CULTURE

EVENTS.push({
  id: 'hawaii-donkey-mill-watercolor-apr',
  source: 'hawaii-manual',
  title: 'Parent-Child Sensory Art: Watercolors - Donkey Mill',
  description: `A beautiful parent-child watercolor painting workshop at the acclaimed Donkey Mill Art Center in historic Holualoa village above Kona. Designed for sensory exploration and creative bonding - children and parents explore watercolor techniques together. $10 per child; accompanying adult FREE. No experience needed. All materials provided. A nurturing, creative experience in one of the island's most charming art spaces.`,
  startDate: d(4, 11, 10, 0),
  endDate: d(4, 11, 12, 0),
  isFree: false,
  cost: '$10 per child; adults FREE',
  externalUrl: 'https://donkeymillartcenter.org/events/',
  ageRange: 'young_kids',
  relevanceScore: 90,
  isApproved: true,
  venueId: 'venue-donkey-mill',
  updatedAt: NOW,
});

EVENTS.push({
  id: 'hawaii-ehcc-exhibition-apr2026',
  source: 'hawaii-manual',
  title: 'East Hawaii Cultural Center - April Exhibition Opening',
  description: `Monthly art exhibition opening at the East Hawaii Cultural Center in downtown Hilo. Showcasing the work of local Big Island artists across various media - painting, sculpture, photography, and traditional Hawaiian arts. Free to attend the opening and explore the galleries. A wonderful way to support local artists and introduce children to the visual arts in a real gallery setting.`,
  startDate: d(4, 10, 17, 0),
  endDate: d(4, 10, 19, 0),
  isFree: true,
  cost: 'FREE',
  externalUrl: 'https://www.easthawaiiculturalcenter.com',
  ageRange: 'all_ages',
  relevanceScore: 80,
  isApproved: true,
  venueId: 'venue-east-hawaii-cultural',
  updatedAt: NOW,
});

// SEED FUNCTIONS

async function deleteOldSeeds() {
  console.log('Removing old SF placeholder events...');
  const oldIds = [
    'seed-sfzoo-free-day',
    'seed-sfpl-storytime',
    'seed-calacademy-family',
    'seed-eastbay-hiking',
    'seed-stem-workshop',
    'seed-farmers-market',
    'seed-art-class',
    'seed-nature-play',
  ];
  const { error } = await supabase.from('events').delete().in('id', oldIds);
  if (error) {
    console.warn('Could not delete old events:', error.message);
  } else {
    console.log('Removed ' + oldIds.length + ' SF placeholder events');
  }
}

async function seedVenues() {
  console.log('Seeding ' + VENUES.length + ' venues...');
  const { error } = await supabase
    .from('venues')
    .upsert(VENUES, { onConflict: 'id', ignoreDuplicates: false });
  if (error) {
    console.error('Venue seed failed:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
  console.log('  ' + VENUES.length + ' venues upserted OK');
  return VENUES.length;
}

async function seedEvents() {
  console.log('Seeding ' + EVENTS.length + ' Hawaii events...');

  const BATCH_SIZE = 50;
  let totalInserted = 0;

  for (let i = 0; i < EVENTS.length; i += BATCH_SIZE) {
    const batch = EVENTS.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('events')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false });
    if (error) {
      console.error('Batch ' + (Math.floor(i / BATCH_SIZE) + 1) + ' failed:', JSON.stringify(error, null, 2));
      process.exit(1);
    }
    totalInserted += batch.length;
    console.log('  Batch ' + (Math.floor(i / BATCH_SIZE) + 1) + ': ' + batch.length + ' events OK');
  }

  console.log(totalInserted + ' Hawaii events upserted total');
  return totalInserted;
}

async function verify() {
  console.log('\nVerifying seeded data...');
  const { data, error } = await supabase
    .from('events')
    .select('id, title, ageRange, isFree, startDate')
    .eq('source', 'hawaii-manual')
    .order('startDate', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Verify error:', error.message);
    return;
  }

  console.log('Sample events in DB (first 20):');
  data.forEach(function(r) {
    const free = r.isFree ? '[FREE]' : '[PAID]';
    const dt = new Date(r.startDate);
    const date = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    console.log('  ' + free + ' [' + date + '] [' + (r.ageRange || 'all_ages') + '] ' + r.title);
  });

  const { count } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'hawaii-manual');
  console.log('\nTotal hawaii-manual events in DB: ' + count);
}

async function main() {
  console.log('HOMEGROWN - HAWAII DATA SEED');
  console.log('============================\n');

  await deleteOldSeeds();
  const venueCount = await seedVenues();
  const eventCount = await seedEvents();
  await verify();

  console.log('\nSEED COMPLETE!');
  console.log('  Venues created: ' + venueCount);
  console.log('  Events seeded: ' + eventCount);
  console.log('  Live app: https://homegrown-phase1-app.netlify.app');
}

main().catch(console.error);
