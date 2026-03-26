/**
 * Region definitions for the region switcher.
 * Stored in localStorage under 'homegrown_region'.
 */

export const REGIONS = {
  hawaii: {
    key: 'hawaii' as const,
    label: 'Big Island, Hawaii',
    shortLabel: 'Big Island',
    city: 'Hilo, HI',
    lat: 19.8968,
    lng: -155.5828,
    radius: 25,
    sourceFilter: 'hawaii-manual',
  },
  sfbay: {
    key: 'sfbay' as const,
    label: 'SF Bay Area',
    shortLabel: 'SF Bay Area',
    city: 'San Francisco, CA',
    lat: 37.7749,
    lng: -122.4194,
    radius: 25,
    sourceFilter: 'manual',
  },
} as const

export type RegionKey = keyof typeof REGIONS
export type Region = (typeof REGIONS)[RegionKey]

export const DEFAULT_REGION: RegionKey = 'hawaii'

export const REGION_LIST: Region[] = Object.values(REGIONS)

export function getStoredRegion(): RegionKey {
  if (typeof window === 'undefined') return DEFAULT_REGION
  try {
    const val = localStorage.getItem('homegrown_region')
    if (val === 'hawaii' || val === 'sfbay') return val
  } catch {
    // ignore
  }
  return DEFAULT_REGION
}

export function storeRegion(region: RegionKey): void {
  try {
    localStorage.setItem('homegrown_region', region)
  } catch {
    // ignore
  }
}
