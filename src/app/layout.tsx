import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Manrope, Montserrat } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { SessionProvider } from '@/lib/client/session'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const sans = Manrope({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' })
const display = Montserrat({ subsets: ['latin', 'latin-ext'], weight: ['600', '700', '800'], variable: '--font-display', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Afrigo Admin', template: '%s | Afrigo Admin' },
  description: 'Operations console for the Afrigo web and mobile apps.',
  robots: { index: false, follow: false }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F7F4' },
    { media: '(prefers-color-scheme: dark)', color: '#070B09' }
  ]
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ToastProvider>
            <SessionProvider>{children}</SessionProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
