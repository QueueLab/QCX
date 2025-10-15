import type { Metadata, Viewport } from 'next'
import { Inter as FontSans } from 'next/font/google'
import './globals.css'
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Sidebar } from '@/components/sidebar'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from '@/components/ui/sonner'
import { MapToggleProvider } from '@/components/map-toggle-context'
import { ProfileToggleProvider } from '@/components/profile-toggle-context'
import { CalendarToggleProvider } from '@/components/calendar-toggle-context'
import { MapLoadingProvider } from '@/components/map-loading-context';
import ConditionalLottie from '@/components/conditional-lottie';
import { MapProvider } from '@/components/map/map-context'
import { MapDataProvider } from '@/components/map/map-data-context'

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
})

const title = 'Beta'
const description =
  'language to Maps'

export const metadata: Metadata = {
  metadataBase: new URL('https://labs.queue.cx'),
  title,
  description,
  openGraph: {
    title,
    description
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
    creator: '@queuelabs'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('font-sans antialiased', fontSans.variable)}>
        <CalendarToggleProvider>
          <MapToggleProvider>
            <ProfileToggleProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="earth"
                enableSystem
                disableTransitionOnChange
                themes={['light', 'dark', 'earth']}
              >
                <MapProvider>
                  <MapDataProvider>
                    <MapLoadingProvider>
                      <Header />
                      <ConditionalLottie />
                      {children}
                      <Sidebar />
                      <Footer />
                      <Toaster />
                    </MapLoadingProvider>
                  </MapDataProvider>
                </MapProvider>
              </ThemeProvider>
            </ProfileToggleProvider>
          </MapToggleProvider>
        </CalendarToggleProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
