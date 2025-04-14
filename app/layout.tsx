'use client'

import type { Metadata, Viewport } from 'next'
import { Inter as FontSans } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { MapToggleProvider } from '@/components/map-toggle-context'
import LoadingScreen from '@/components/ui/loading-screen'
import { useState } from 'react'

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
})

// Note: You can't use metadata or viewport exports in client components
// So we'll need to define these differently

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  const [isMapLoading, setIsMapLoading] = useState(true);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('font-sans antialiased', fontSans.variable)}>
        <MapToggleProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            themes={['light', 'dark', 'earth']}
          >
            <LoadingScreen isLoading={isMapLoading} />
            <Header />
            {children}
            <Sidebar />
            <Footer />
            <Toaster />
          </ThemeProvider>
        </MapToggleProvider>
      </body>
    </html>
  )
}
