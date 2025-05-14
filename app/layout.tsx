"use client"; // Make this a client component to use state

// Keep types for reference if needed later, though static export is removed
// import type { Metadata, Viewport } from 'next'; 
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Sidebar } from '@/components/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { MapToggleProvider } from '@/components/map-toggle-context';
import { ProfileToggleProvider } from '@/components/profile-toggle-context';

import React, { useState, createContext, useContext, Dispatch, SetStateAction, useEffect } from 'react';
import LoadingScreen from '@/components/ui/loading-screen';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Context for map loading state
interface MapLoadingContextType {
  isMapLoading: boolean;
  setIsMapLoading: Dispatch<SetStateAction<boolean>>;
}

const MapLoadingContext = createContext<MapLoadingContextType | undefined>(undefined);

export const useMapLoading = (): MapLoadingContextType => {
  const context = useContext(MapLoadingContext);
  if (context === undefined) {
    throw new Error('useMapLoading must be used within a MapLoadingProvider');
  }
  return context;
};

// Per PR description: "Removed static metadata/viewport exports due to client component constraints."
// export const metadata: Metadata = {
//   metadataBase: new URL('https://labs.queue.cx'),
//   title: 'QCX',
//   description: 'language to Maps',
//   openGraph: {
//     title: 'QCX',
//     description: 'language to Maps',
//   },
//   twitter: {
//     title: 'QCX',
//     description: 'language to Maps',
//     card: 'summary_large_image',
//     creator: '@queuelabs',
//   },
// };

// export const viewport: Viewport = {
//   width: 'device-width',
//   initialScale: 1,
//   minimumScale: 1,
//   maximumScale: 1,
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMapLoading, setIsMapLoading] = useState(true);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('font-sans antialiased', fontSans.variable)}>
        <MapLoadingContext.Provider value={{ isMapLoading, setIsMapLoading }}>
          <LoadingScreen isLoading={isMapLoading} />
          <MapToggleProvider>
            <ProfileToggleProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
                themes={['light', 'dark', 'earth']}
              >
                <Header />
                {/* Children (e.g., page.tsx) will consume MapLoadingContext 
                    and call setIsMapLoading(false) when the map is loaded 
                    via the Mapbox component's onLoad prop. */}
                {children}
                <Footer />
                <Sidebar />
                <Toaster />
              </ThemeProvider>
            </ProfileToggleProvider>
          </MapToggleProvider>
        </MapLoadingContext.Provider>
      </body>
    </html>
  );
}

