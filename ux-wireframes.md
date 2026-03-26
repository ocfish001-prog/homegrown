# Homegrown — UX Redesign Wireframes
**Date:** March 25, 2026 | **Phase:** 1.5 UI/UX Redesign

---

## 1. JTBD Analysis

**Core Job:** *"When I'm planning our week, I want to quickly find enrichment activities near me that fit my kids' ages and interests, so I feel like a proactive, connected homeschool parent — not isolated and scrambling."*

**Functional dimension:** Discover → evaluate → commit. Low-friction browsing → confident decision-making (register or save) without leaving the app.

**Emotional dimension:** Homeschool parents carry ambient anxiety of "am I doing enough?" — every relevant event found relieves that pressure. The app needs to make discovery feel abundant and effortless, not sparse.

**Hiring context:** Micro-sessions — waiting in the car, between lessons, Sunday night planning. Must deliver value in under 10 seconds of opening.

---

## 2. Heuristic Audit — Current Site

| # | Heuristic | Issue | Severity |
|---|---|---|---|
| 1 | Visibility of System Status | "No events yet" dead end, no feedback about what system is doing | 4 — Catastrophic |
| 2 | Match Between System & Real World | Abstract platform language, users think "what's happening Saturday for my 9-year-old" | 2 — Minor |
| 4 | Consistency & Standards | No bottom nav on mobile violates every consumer app convention | 3 — Major |
| 6 | Recognition Rather Than Recall | No filter pills, no category shortcuts, no featured/trending | 3 — Major |
| 7 | Flexibility & Efficiency | No location interaction, no saved preferences, every session starts from zero | 3 — Major |
| 8 | Aesthetic & Minimalist Design | Technically minimal but wrong direction — empty rather than focused | 4 — Catastrophic |
| 10 | Help & Documentation | Passive empty state, no CTA, no way to get notified | 3 — Major |

---

## 3. Screen 1: Home / Discovery Feed

### Layout (Mobile-First, 375px)

```
┌─────────────────────────────────┐
│  STATUS BAR (system)            │
├─────────────────────────────────┤
│  HEADER                         │
│  🌱 Homegrown                   │
│  [📍 SF Bay Area ▼]  ← tappable, prominent location chip
├─────────────────────────────────┤
│  SEARCH BAR (full-width, 48px, rounded-full)
│  🔍  Search events, co-ops...   │
├─────────────────────────────────┤
│  CATEGORY FILTER PILLS (horizontal scroll)
│  [All] [Classes] [Events] [Co-ops] [Camps] [Workshops] [Field Trips]
├─────────────────────────────────┤
│  "This Week Near You"  See all→ │
├─────────────────────────────────┤
│  CARD GRID (2-col)              │
│  ┌──────────┐  ┌──────────┐    │
│  │ [IMAGE]  │  │ [IMAGE]  │    │  160px tall, cover fit, rounded-12 top
│  │ [CO-OP]  │  │ [CLASS]  │    │  category pill overlay, bottom-left
│  │       [♡]│  │       [♡]│    │  save btn, top-right, 32px touch target
│  ├──────────┤  ├──────────┤    │
│  │ Title    │  │ Title    │    │  14px semibold, 2-line max
│  │ Sat Mar 29│ │ Sun Mar 30│   │  12px warm gray
│  │ 📍 Palo  │  │ 📍 Fre-  │    │  12px warm gray, 1-line truncated
│  │ Alto     │  │ mont     │    │
│  └──────────┘  └──────────┘    │
├─────────────────────────────────┤
│  BOTTOM NAV (fixed, 83px)       │
│  [🏠Home] [🔍Discover] [📅Cal] [♡Saved]
└─────────────────────────────────┘
```

### Card Anatomy
1. **Image** — 160px tall, rounded-12 top, cover fit. Fallback: sage→mauve gradient. Never broken state.
2. **Category pill** — bottom-left image overlay. 10px uppercase, sage bg, white text
3. **Save button** — bookmark icon, top-right, 32×32px touch target, semi-transparent white bg circle
4. **Event title** — 14px semibold, max 2 lines, ellipsis
5. **Date/time** — 12px, warm gray. Format: "Sat Mar 29 · 10am"
6. **Location** — 📍 + city/neighborhood, 12px warm gray, 1-line max
7. **Organizer** (optional) — 11px, mauve text

**Card states:**
- Default: white bg, rounded-12, shadow `0 2px 8px rgba(0,0,0,0.08)`
- Pressed: scale(0.97), 120ms ease-out
- Saved: bookmark icon fills with mauve tint

### Skeleton Loader
- 4 shimmer cards (2×2 grid) before content loads
- Shimmer: gradient #F0EDEC → #E8E4E2 → #F0EDEC, 1.5s loop, 400ms stagger
- Header/filter pills NOT shimmer — they render immediately

### Category Filter Pills
- Container: horizontal scroll, no visible scrollbar, 16px left pad
- Pill: 36px height, rounded-full, 16px horizontal padding
- Active: sage (#919A84) bg, white text
- Inactive: white bg, warm gray border (1px), #555 text
- Order: All → Classes → Events → Co-ops → Camps → Workshops → Field Trips → Support Groups

### Bottom Navigation Bar
- Height: 83px (49px nav + 34px iOS safe area)
- Background: white, 1px top border #CFCBCA
- Active: filled icon + sage label (#919A84), 600 weight
- Inactive: outlined icon + #888 label, 400 weight
- Touch targets: 44×44px minimum
- Tabs: Home | Discover | Calendar | Saved

---

## 4. Screen 2: Event Detail

```
┌─────────────────────────────────┐
│  ← Back           [♡] [⬆Share] │  transparent overlay on hero
│  HERO IMAGE (260px, cover fit)  │
│    gradient overlay bottom 80px │
│    [CO-OP] pill bottom-left     │
├─────────────────────────────────┤
│  SCROLLABLE CONTENT             │
│  [East Bay Homeschool Co-op]    │  12px mauve, organizer
│  Nature Art Workshop for Kids   │  24px bold, 2-line max
│  ─────────────────────          │
│  📅  Saturday, March 29 · 10am–12pm
│  📍  Tilden Regional Park       │  tappable → Maps
│      Berkeley, CA               │
│  👥  Ages 6–12 · All Levels     │
│  💰  Free / $15 suggested       │
│  ─────────────────────          │
│  About this event               │  16px semibold
│  [3 lines collapsed + Read more]│
│  ─────────────────────          │
│  Organizer                      │  16px semibold
│  [Avatar] East Bay Co-op        │  40px avatar, name, event count
│  [View Profile →]               │
│  ─────────────────────          │
│  You might also like            │  horizontal scroll
│  ← [card] [card] [card] →       │  140px wide cards
│  [100px bottom padding]         │
├─────────────────────────────────┤
│  STICKY CTA                     │
│  [Register / Learn More →]      │  52px, full-width, sage bg, white text
└─────────────────────────────────┘
```

### Key Behaviors
- Hero: parallax scroll (0.5x rate) for depth
- Location: tappable → Apple/Google Maps
- Description: 3-line collapse with "Read more" expand
- Related events: horizontal scroll, 140px cards
- Sticky CTA: always visible, links to external registration

---

## 5. Screen 3: Category Filter View

```
┌─────────────────────────────────┐
│  STICKY FILTER BAR              │
│  ← [Classes ×] [Age ▼] [Date ▼] [Distance ▼] [🔧 More]
│  "14 results"                   │  result count below bar
├─────────────────────────────────┤
│  RESULTS: same card grid as home│
│  Cards sorted by relevance/date │
├─────────────────────────────────┤
│  EMPTY STATE (when no results)  │
│  [🔍 illustration]              │
│  "No classes found nearby"      │  20px semibold
│  "Try expanding your area or    │  14px warm gray
│   browsing all event types"     │
│  [Browse All Events]            │  sage button, primary CTA
│  [Adjust Filters]               │  ghost button, secondary CTA
└─────────────────────────────────┘
```

### Filter Bar Details
- Sticky on scroll, 52px height, horizontal scroll
- Active filter: shows category name + × to clear, sage bg
- Dropdown filters: Age Range, Date, Distance (modal sheet on mobile)
- Result count: "14 results" in 12px warm gray, updates live
- Empty state: never just text — illustration + two action paths

---

## 6. Design Principles

1. **Abundance over emptiness** — Even with zero events, the app should feel alive. Use placeholder cards, "coming soon" teasers, or featured organizer profiles.

2. **Location is identity** — "SF Bay Area" isn't a chip, it's the app's context. Make it the most prominent interactive element. Tapping it should feel like "switching cities."

3. **Cards are conversations** — Every card must answer: What is it? When? Where? Who's it for? Answer all four without the user tapping.

4. **Progress, not features** — Users hire this app to feel like good parents. Every interaction should move them closer to registering for something. Remove every step between "browsing" and "going."

5. **Earthy but modern** — The palette (sage, mauve, warm gray) should feel like a well-designed consumer brand, not a craft fair. Think Patagonia or Allbirds — natural materials, premium execution.
