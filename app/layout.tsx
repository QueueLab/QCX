import type { Metadata, Viewport } from 'next'
import { Inter as FontSans } from 'next/font/google'
import './globals.css'
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
import { MapLoadingProvider } from '@/components/map-loading-context';
import { IsLoadingProvider } from '@/components/is-loading-provider';
import ConditionalLottie from '@/components/conditional-lottie';

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
        <IsLoadingProvider>
          <MapToggleProvider>
            <ProfileToggleProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="earth"
                enableSystem
                disableTransitionOnChange
                themes={['light', 'dark', 'earth']}
              >
                <MapLoadingProvider>
                  <Header />
                  <ConditionalLottie />
                  {children}
                  <Sidebar />
                  <Footer />
                  <Toaster />
                </MapLoadingProvider>
              </ThemeProvider>
            </ProfileToggleProvider>
          </MapToggleProvider>
        </IsLoadingProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
