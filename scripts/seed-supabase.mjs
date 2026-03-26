/**
 * Seed Supabase events table with 8 Bay Area family events.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wbzxfwlgldrobubcssoa.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indienhmd2xnbGRyb2J1YmNzc29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5Njc3NiwiZXhwIjoyMDkwMDcyNzc2fQ.a6Ghoy_6ybrR4TLsG3ZMAZPhQ1jxtu3RTl8zJxPseP4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const now = new Date();
const d = (days, hours = 0) => {
  const dt = new Date(now);
  dt.setDate(dt.getDate() + days);
  dt.setHours(dt.getHours() + hours);
  return dt.toISOString();
};

const SEED_EVENTS = [
  {
    id: 'seed-sfzoo-free-day',
    source: 'manual',
    title: 'SF Zoo Free Day for San Francisco Residents',
    description: 'San Francisco residents get free admission to the San Francisco Zoo. Explore over 250 exotic, endangered and rescued animals. Great for the whole family!',
    startDate: d(2),
    endDate: d(2, 8),
    isFree: true,
    cost: 'Free for SF residents',
    externalUrl: 'https://www.sfzoo.org/',
    ageRange: 'young_kids',
    relevanceScore: 90,
    isApproved: true,
    updatedAt: now.toISOString(),
  },
  {
    id: 'seed-sfpl-storytime',
    source: 'manual',
    title: 'SFPL Family Storytime at Main Library',
    description: 'Interactive storytime for children ages 2–6. Stories, songs, and rhymes to build early literacy skills. Drop-in, no registration required.',
    startDate: d(3),
    endDate: d(3, 1),
    isFree: true,
    cost: 'Free',
    externalUrl: 'https://sfpl.org/events',
    ageRange: 'young_kids',
    relevanceScore: 85,
    isApproved: true,
    updatedAt: now.toISOString(),
  },
  {
    id: 'seed-calacademy-family',
    source: 'manual',
    title: 'Family Saturday at California Academy of Sciences',
    description: 'Spend Saturday exploring the living roof, aquarium, rainforest dome, and planetarium at the Cal Academy. Interactive exhibits for all ages.',
    startDate: d(4),
    endDate: d(4, 6),
    isFree: false,
    cost: '$26–$37 (members free)',
    externalUrl: 'https://www.calacademy.org/',
    ageRange: 'all_ages',
    relevanceScore: 88,
    isApproved: true,
    updatedAt: now.toISOString(),
  },
  {
    id: 'seed-eastbay-hiking',
    source: 'manual',
    title: 'Family Hiking Club — Tilden Regional Park',
    description: 'Guided family-friendly hike through Tilden Regional Park. 2-mile loop, gentle terrain, wildlife spotting. All ages welcome. Bring water and snacks.',
    startDate: d(5),
    endDate: d(5, 3),
    isFree: true,
    cost: 'Free (parking $5)',
    externalUrl: 'https://www.ebparks.org/parks/tilden',
    ageRange: 'family',
    relevanceScore: 88,
    isApproved: true,
    updatedAt: now.toISOString(),
  },
  {
    id: 'seed-stem-workshop',
    source: 'manual',
    title: 'Kids STEM Workshop — Robotics & Coding',
    description: 'Hands-on robotics workshop for kids ages 8–14. Build and program simple robots using Scratch and LEGO Mindstorms. Space limited.',
    startDate: d(6),
    endDate: d(6, 2),
    isFree: false,
    cost: '$20',
    externalUrl: 'https://www.makersf.org/',
    ageRange: 'older_kids',
    relevanceScore: 92,
    isApproved: true,
    updatedAt: now.toISOString(),
  },
  {
    id: 'seed-farmers-market',
    source: 'manual',
    title: 'Ferry Plaza Farmers Market — Family Saturday',
    description: "SF's best farmers market at the Ferry Building. Local produce, artisan food, live music, and kids' activities every Saturday morning.",
    startDate: d(7),
    endDate: d(7, 4),
    isFree: true,
    cost: 'Free entry',
    externalUrl: 'https://cuesa.org/markets/ferry-plaza-farmers-market',
    ageRange: 'all_ages',
    relevanceScore: 82,
    isApproved: true,
    updatedAt: now.toISOString(),
  },
  {
    id: 'seed-art-class',
    source: 'manual',
    title: 'Kiddo Art Class — Watercolor Explorers',
    description: 'Drop-in watercolor painting class for children ages 5–12. All materials provided. Taught by a local artist.',
    startDate: d(8),
    endDate: d(8, 2),
    isFree: false,
    cost: '$15 per child',
    externalUrl: 'https://www.creativegrowth.org/',
    ageRange: 'young_kids',
    relevanceScore: 78,
    isApproved: true,
    updatedAt: now.toISOString(),
  },
  {
    id: 'seed-nature-play',
    source: 'manual',
    title: 'Nature Play Day — Crissy Field',
    description: 'Unstructured outdoor play at Crissy Field with naturalist guides. Kids explore tide pools, sand dunes, and shoreline habitats.',
    startDate: d(9),
    endDate: d(9, 3),
    isFree: true,
    cost: 'Free',
    externalUrl: 'https://www.parksconservancy.org/',
    ageRange: 'family',
    relevanceScore: 86,
    isApproved: true,
    updatedAt: now.toISOString(),
  },
];

async function seed() {
  console.log('🌱 Seeding Supabase events...');

  const { data, error } = await supabase
    .from('events')
    .upsert(SEED_EVENTS, { onConflict: 'id', ignoreDuplicates: false });

  if (error) {
    console.error('❌ Seed failed:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log(`✅ Seeded ${SEED_EVENTS.length} events successfully`);

  // Verify
  const { data: rows, error: fetchErr } = await supabase
    .from('events')
    .select('id,title,ageRange')
    .in('id', SEED_EVENTS.map(e => e.id));

  if (fetchErr) {
    console.error('Verify error:', fetchErr.message);
  } else {
    console.log('\n📊 Events in DB:');
    rows.forEach(r => console.log(`  • [${r.ageRange ?? 'unclassified'}] ${r.title}`));
  }
}

seed().catch(console.error);
