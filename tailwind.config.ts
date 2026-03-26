import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          DEFAULT: '#919A84',
          light: '#A8B09C',
          dark: '#7A8270',
        },
        mauve: {
          DEFAULT: '#BF9CB1',
          light: '#D0B5C5',
          dark: '#A8849C',
        },
        'warm-gray': {
          DEFAULT: '#CFCBCA',
          light: '#E0DCDB',
          dark: '#B5B0AF',
        },
        cream: {
          DEFAULT: '#F5F0E8',
          dark: '#EDE8DF',
        },
        bark: {
          DEFAULT: '#4A3728',
          light: '#5C4535',
          dark: '#362819',
        },
        sky: {
          DEFAULT: '#7BA3C0',
        },
        moss: {
          DEFAULT: '#5C7A56',
        },
        // shadcn/ui CSS variable mappings
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        heading: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
      },
      fontSize: {
        display: ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em' }],
        h1: ['1.875rem', { lineHeight: '2.375rem', letterSpacing: '-0.02em' }],
        h2: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
        h3: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        h4: ['1.0625rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
        'body-lg': ['1rem', { lineHeight: '1.625rem', letterSpacing: '0' }],
        body: ['0.9375rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
        'body-sm': ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0' }],
        caption: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }],
        label: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        pill: '9999px',
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(74,55,40,0.08), 0 1px 2px -1px rgba(74,55,40,0.04)',
        'card-hover':
          '0 4px 12px 0 rgba(74,55,40,0.12), 0 2px 4px -1px rgba(74,55,40,0.06)',
        overlay: '0 -1px 12px 0 rgba(74,55,40,0.10)',
        search: '0 2px 8px 0 rgba(145,154,132,0.20)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'heart-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'fade-up': 'fade-up 0.25s ease-out forwards',
        'scale-in': 'scale-in 0.20s ease-out forwards',
        'heart-pop': 'heart-pop 0.3s ease-out',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

export default config
