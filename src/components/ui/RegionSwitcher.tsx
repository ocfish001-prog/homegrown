'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REGION_LIST, type RegionKey } from '@/lib/region'
import { useRegion } from '@/context/RegionContext'

interface RegionSwitcherProps {
  className?: string
  compact?: boolean
}

export default function RegionSwitcher({ className, compact = false }: RegionSwitcherProps) {
  const { regionKey, region, setRegion } = useRegion()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  function handleOpen() {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX })
    }
    setIsOpen((v) => !v)
  }

  function handleSelect(key: RegionKey) {
    setRegion(key)
    setIsOpen(false)
  }

  const dropdown = mounted && isOpen ? createPortal(
    <div
      ref={dropdownRef}
      role="listbox"
      aria-label="Select region"
      style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left }}
      className="z-[9999] min-w-[200px] bg-white rounded-xl shadow-lg border border-warm-gray/20 py-1.5"
    >
      <p className="text-[10px] font-semibold text-warm-gray-dark uppercase tracking-wide px-3 py-1.5">
        Region
      </p>
      {REGION_LIST.map((r) => (
        <button
          key={r.key}
          role="option"
          aria-selected={regionKey === r.key}
          type="button"
          onClick={() => handleSelect(r.key)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5',
            'text-[13px] font-medium text-left',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sage',
            'min-h-[44px]',
            regionKey === r.key
              ? 'bg-sage/10 text-bark'
              : 'text-bark/80 hover:bg-warm-gray/10'
          )}
        >
          <MapPin
            className={cn('w-3.5 h-3.5 shrink-0', regionKey === r.key ? 'text-sage' : 'text-warm-gray-dark')}
            aria-hidden="true"
          />
          <div className="flex-1">
            <div>{r.label}</div>
            <div className="text-[11px] text-warm-gray-dark font-normal">{r.city}</div>
          </div>
          {regionKey === r.key && (
            <Check className="w-3.5 h-3.5 text-sage shrink-0" aria-hidden="true" />
          )}
        </button>
      ))}
    </div>,
    document.body
  ) : null

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          'inline-flex items-center gap-1.5',
          'rounded-full',
          'bg-sage/15 text-bark',
          'font-medium',
          'border border-sage/30',
          'transition-all duration-150',
          'hover:bg-sage/25 hover:border-sage/50',
          'active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage',
          compact
            ? 'px-2.5 py-1 text-[12px] min-h-[44px]'
            : 'px-3 py-1.5 text-[13px] min-h-[44px]'
        )}
        aria-label={`Region: ${region.label}. Tap to switch region.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <MapPin
          className={cn('text-sage shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')}
          aria-hidden="true"
        />
        <span className="truncate max-w-[120px]">
          {compact ? region.shortLabel : region.label}
        </span>
        <ChevronDown
          className={cn(
            'text-sage/70 transition-transform duration-150 shrink-0',
            compact ? 'w-3 h-3' : 'w-3.5 h-3.5',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>
      {dropdown}
    </div>
  )
}
