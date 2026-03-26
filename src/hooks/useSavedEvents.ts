'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'homegrown-saved-events'

function readFromStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeToStorage(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

export function useSavedEvents() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const ids = readFromStorage()
    setSavedIds(new Set(ids))
    setHydrated(true)
  }, [])

  const isSaved = useCallback(
    (id: string) => savedIds.has(id),
    [savedIds]
  )

  const toggleSaved = useCallback((id: string, saved: boolean) => {
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (saved) {
        next.add(id)
      } else {
        next.delete(id)
      }
      writeToStorage(Array.from(next))
      return next
    })
  }, [])

  const getSavedIds = useCallback(() => Array.from(savedIds), [savedIds])

  return { savedIds, isSaved, toggleSaved, getSavedIds, hydrated }
}
