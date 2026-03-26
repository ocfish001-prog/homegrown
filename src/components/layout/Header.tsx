'use client'

import { useState } from 'react'
import Link from 'next/link'
import RegionSwitcher from '@/components/ui/RegionSwitcher'

const navLinks = [
  { href: '/events', label: 'Events' },
  { href: '/coops', label: 'Co-ops' },
  { href: '/vendors', label: 'Vendors' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-cream border-b border-stone/20 sticky top-0 z-50" role="banner">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo / Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2 text-bark font-semibold text-lg hover:text-sage transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded"
          aria-label="Homegrown — go to homepage"
        >
          <span aria-hidden="true">🌱</span>
          <span>Homegrown</span>
        </Link>

        {/* Desktop Nav */}
        <nav
          className="hidden md:flex items-center gap-6"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-bark/80 hover:text-sage font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded px-1"
            >
              {link.label}
            </Link>
          ))}
          {/* Region switcher */}
          <RegionSwitcher compact />
        </nav>

        {/* Mobile: Region switcher + Hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <RegionSwitcher compact />
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-2 rounded text-bark hover:text-sage focus:outline-none focus-visible:ring-2 focus-visible:ring-sage"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          className="md:hidden bg-cream border-t border-stone/20 px-4 py-3"
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded text-bark/80 hover:text-sage hover:bg-sage/10 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
