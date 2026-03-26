'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  REGIONS,
  DEFAULT_REGION,
  getStoredRegion,
  storeRegion,
  type RegionKey,
  type Region,
} from '@/lib/region'

interface RegionContextValue {
  regionKey: RegionKey
  region: Region
  setRegion: (key: RegionKey) => void
}

const RegionContext = createContext<RegionContextValue>({
  regionKey: DEFAULT_REGION,
  region: REGIONS[DEFAULT_REGION],
  setRegion: () => {},
})

export function RegionProvider({ children }: { children: React.ReactNode }) {
  const [regionKey, setRegionKey] = useState<RegionKey>(DEFAULT_REGION)

  // Hydrate from localStorage on mount
  useEffect(() => {
    setRegionKey(getStoredRegion())
  }, [])

  const setRegion = useCallback((key: RegionKey) => {
    storeRegion(key)
    setRegionKey(key)
  }, [])

  return (
    <RegionContext.Provider
      value={{ regionKey, region: REGIONS[regionKey], setRegion }}
    >
      {children}
    </RegionContext.Provider>
  )
}

export function useRegion() {
  return useContext(RegionContext)
}
