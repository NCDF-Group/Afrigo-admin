import type { Config } from 'tailwindcss'

const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        subtle: token('subtle'),
        line: token('line'),
        fg: token('fg'),
        muted: token('muted'),
        faint: token('faint'),
        primary: { DEFAULT: token('primary'), fg: token('primary-fg'), soft: token('primary-soft') },
        accent: { DEFAULT: token('accent'), soft: token('accent-soft') },
        success: { DEFAULT: token('success'), soft: token('success-soft') },
        warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
        info: { DEFAULT: token('info'), soft: token('info-soft') },
        brand: { DEFAULT: '#025344', lime: '#7CB041' }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.04), 0 1px 1px rgb(var(--shadow) / 0.02)',
        pop: '0 12px 32px -8px rgb(var(--shadow) / 0.18), 0 2px 6px rgb(var(--shadow) / 0.06)'
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        'ping-soft': { '0%': { transform: 'scale(1)', opacity: '0.7' }, '100%': { transform: 'scale(3.2)', opacity: '0' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } }
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        rise: 'rise .28s cubic-bezier(.2,.8,.2,1)',
        'slide-in': 'slide-in .28s cubic-bezier(.2,.8,.2,1)',
        'slide-in-left': 'slide-in-left .28s cubic-bezier(.2,.8,.2,1)',
        'ping-soft': 'ping-soft 1.8s cubic-bezier(0,0,.2,1) forwards',
        shimmer: 'shimmer 1.6s linear infinite'
      }
    }
  },
  plugins: []
} satisfies Config
