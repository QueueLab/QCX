import type { Metadata, Viewport } from 'next'
import { Inter as FontSans, Poppins } from 'next/font/google'
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
import { UsageToggleProvider } from '@/components/usage-toggle-context'
import { CalendarToggleProvider } from '@/components/calendar-toggle-context'
import { MapLoadingProvider } from '@/components/map-loading-context';
import ConditionalLottie from '@/components/conditional-lottie';
import { MapProvider as MapContextProvider } from '@/components/map/map-context'

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
})

const fontPoppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700']
})

const title = ''
const description =
  'language to Maps'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.qcx.world'),
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
    creator: '@queueLab'
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
      <body
        className={cn(
          'font-sans antialiased',
          fontSans.variable,
          fontPoppins.variable
        )}
      >
        <CalendarToggleProvider>
          <MapToggleProvider>
            <ProfileToggleProvider>
              <UsageToggleProvider>
                <ThemeProvider
                  attribute="class"
                defaultTheme="earth"
                enableSystem
                disableTransitionOnChange
                themes={['light', 'dark', 'earth']}
              >
                <MapContextProvider>
                  <MapLoadingProvider>
                    <Header />
                    <ConditionalLottie />
                    {children}
                    <Sidebar />
                    <Footer />
                    <Toaster />
                  </MapLoadingProvider>
                </MapContextProvider>
              </ThemeProvider>
            </UsageToggleProvider>
          </ProfileToggleProvider>
        </MapToggleProvider>
        </CalendarToggleProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
