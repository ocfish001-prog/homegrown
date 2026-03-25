import Link from 'next/link'

const footerLinks = [
  { href: '/about', label: 'About' },
  { href: '/events/add', label: 'Add Event' },
  { href: '/vendors/submit', label: 'Submit Vendor' },
  { href: '/coops', label: 'Co-ops' },
]

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-bark text-cream/80 mt-auto" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tagline */}
          <p className="text-center md:text-left text-sm font-medium">
            <span aria-hidden="true">🌱</span>{' '}
            <strong className="text-cream">Homegrown</strong> — Local enrichment for homeschool families
          </p>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-cream/70 hover:text-cream transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-cream/40 mt-6">
          &copy; {year} Homegrown. Built with love for homeschool families.
        </p>
      </div>
    </footer>
  )
}
