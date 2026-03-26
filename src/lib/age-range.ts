/**
 * Age Range Classifier for Homegrown Events
 *
 * Classifies events based on title, description, and tags into one of:
 *   young_kids  — ages 0–7 (toddlers, early childhood)
 *   older_kids  — ages 8–14 (tweens, teen programs)
 *   all_ages    — explicitly suitable for all ages
 *   family      — family-oriented, may require adult supervision
 *
 * Design intent: INCLUDE more events, don't filter out. Tag and let the
 * user decide via filter. Events that were previously excluded for not
 * being "kid-focused" should now be tagged "family" and kept.
 */

import type { AgeRange } from './types'

// Signals strongly indicating young kids (0–7)
const YOUNG_KIDS_SIGNALS = [
  /\btoddler/i,
  /\bbaby\b/i,
  /\bbabies\b/i,
  /\binfant/i,
  /\bpreschool/i,
  /\bpre-?k\b/i,
  /\bstorytime\b/i,
  /\bstory time\b/i,
  /\bsensory play\b/i,
  /\bpetting zoo\b/i,
  /\bsing.?along/i,
  /\brhyme time\b/i,
  /\bearly childhood/i,
  /\bnursery/i,
  /\bage[s]?\s*0[-–]\s*[3-7]\b/i,
  /\bages?\s*2[-–]/i,
  /\bunder\s*5\b/i,
  /\bunder\s*6\b/i,
  /\b0[-–]\s*5\b/i,
]

// Signals strongly indicating older kids (8–14) / tweens / teens
const OLDER_KIDS_SIGNALS = [
  /\btween/i,
  /\bteen\b/i,
  /\byouth\b/i,
  /\bjunior\b/i,
  /\bafter.?school\b/i,
  /\bmiddle school\b/i,
  /\bhigh school\b/i,
  /\bstem\b/i,
  /\brobotic/i,
  /\bcoding\s+camp/i,
  /\bsummer camp\b/i,
  /\bscience\s+camp/i,
  /\b4[- ]?h\s+club\b/i,
  /\bhomeschool/i,
  /\bhome.?school/i,
  /\bgrade[s]?\s*[3-8]\b/i,
  /\bgrade[s]?\s*[4-9]\b/i,
  /\bages?\s*8[-–]/i,
  /\bages?\s*9[-–]/i,
  /\bages?\s*10[-–]/i,
  /\bages?\s*12[-–]/i,
  /\b8[-–]14\b/i,
  /\b8[-–]18\b/i,
]

// Signals indicating all ages welcome
const ALL_AGES_SIGNALS = [
  /\ball ages?\b/i,
  /\bfor all ages?\b/i,
  /\bwelcome all ages?\b/i,
  /\beveryone welcome\b/i,
  /\bkids? of all ages?\b/i,
  /\bfree for all\b/i,
]

// Signals indicating family events (not strictly kid-focused but appropriate)
const FAMILY_SIGNALS = [
  /\bfamily\b/i,
  /\bfamilies\b/i,
  /\bkids?\s+welcome\b/i,
  /\bkid.?friendly\b/i,
  /\bstroller\b/i,
  /\bparents?\s+and\s+kids?\b/i,
  /\bchildren\b/i,
  /\bchild\b/i,
  /\bfun for\s+the\s+whole/i,
  /\bbrings?\s+the\s+kids?\b/i,
  /\bbring\s+your\s+kids?\b/i,
]

/**
 * Classify a single text string. Returns null if no signal found.
 */
function classifyText(text: string): AgeRange | null {
  if (ALL_AGES_SIGNALS.some((r) => r.test(text))) return 'all_ages'
  if (YOUNG_KIDS_SIGNALS.some((r) => r.test(text))) return 'young_kids'
  if (OLDER_KIDS_SIGNALS.some((r) => r.test(text))) return 'older_kids'
  if (FAMILY_SIGNALS.some((r) => r.test(text))) return 'family'
  return null
}

/**
 * Infer age range for an event based on title, description, and tags.
 *
 * Returns 'family' as a fallback for events that don't match any specific
 * signal but are from known family-friendly sources.
 *
 * @param title - Event title
 * @param description - Event description (optional)
 * @param tags - Event tags (optional)
 * @param source - Event source name (used for source-based defaults)
 * @param existingAgeRange - Pre-assigned age range (pass through if set)
 */
export function inferAgeRange(
  title: string,
  description?: string,
  tags?: string[],
  source?: string,
  existingAgeRange?: AgeRange
): AgeRange {
  if (existingAgeRange) return existingAgeRange

  // Combine all text for classification
  const combined = [
    title,
    description ?? '',
    ...(tags ?? []),
  ].join(' ')

  const classified = classifyText(combined)
  if (classified) return classified

  // Source-based defaults — these sources are inherently family/kid-oriented
  const YOUNG_KIDS_SOURCES = new Set(['sfpl', 'smcl', 'cahomeschool'])
  const FAMILY_SOURCES = new Set(['sfzoo', 'calacademy', 'ebparks', 'nps', 'funcheap', 'sffun', 'bayareakidfun'])
  const KID_SOURCES = new Set(['4h', 'cahomeschool'])

  if (source) {
    if (YOUNG_KIDS_SOURCES.has(source)) return 'young_kids'
    if (KID_SOURCES.has(source)) return 'older_kids'
    if (FAMILY_SOURCES.has(source)) return 'family'
  }

  // Default: family — better to include than exclude
  return 'family'
}

/**
 * Batch-classify an array of events, adding ageRange where missing.
 */
export function classifyEventAgeRanges<T extends {
  title: string
  description?: string
  tags?: string[]
  source: string
  ageRange?: AgeRange
}>(events: T[]): T[] {
  return events.map((ev) => ({
    ...ev,
    ageRange: inferAgeRange(ev.title, ev.description, ev.tags, ev.source, ev.ageRange),
  }))
}
