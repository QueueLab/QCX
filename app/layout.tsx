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
import { CalendarToggleProvider } from '@/components/calendar-toggle-context'
import { MapLoadingProvider } from '@/components/map-loading-context';
import ConditionalLottie from '@/components/conditional-lottie';
import { MapProvider } from '@/components/map/map-context'
import { getSupabaseUserAndSessionOnServer } from '@/lib/auth/get-current-user'

// Force dynamic rendering since we check auth with cookies
export const dynamic = 'force-dynamic'

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

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  // Check authentication and conditionally render the layout
  const { user } = await getSupabaseUserAndSessionOnServer();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'font-sans antialiased',
          fontSans.variable,
          fontPoppins.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark']}
        >
          {user ? (
            <CalendarToggleProvider>
              <MapToggleProvider>
                <ProfileToggleProvider>
                  <MapProvider>
                    <MapLoadingProvider>
                      <Header />
                      <ConditionalLottie />
                      {children}
                      <Sidebar />
                      <Footer />
                      <Toaster />
                    </MapLoadingProvider>
                  </MapProvider>
                </ProfileToggleProvider>
              </MapToggleProvider>
            </CalendarToggleProvider>
          ) : (
            children
          )}
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
