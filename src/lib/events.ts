/**
 * Event categories and utilities for Homegrown
 * Phase 2: No placeholder events — real data only from APIs
 */

export const CATEGORIES = [
  'All',
  'Classes',
  'Events',
  'Co-ops',
  'Camps',
  'Workshops',
  'Field Trips',
  'Support Groups',
  'Music',
  'Arts',
  'Community',
  'Sports',
  'Food & Drink',
] as const

export type EventCategory = typeof CATEGORIES[number]
