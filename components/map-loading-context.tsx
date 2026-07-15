'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MapLoadingContextType {
  isMapLoaded: boolean;
  setIsMapLoaded: (isLoaded: boolean) => void;
}

const MapLoadingContext = createContext<MapLoadingContextType | undefined>(undefined);

export const MapLoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    // Automatic fallback to map loaded after 1 second to prevent blocking tests or local setups without keys
    const timer = setTimeout(() => {
      setIsMapLoaded(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <MapLoadingContext.Provider value={{ isMapLoaded, setIsMapLoaded }}>
      {children}
    </MapLoadingContext.Provider>
  );
};

export const useMapLoading = () => {
  const context = useContext(MapLoadingContext);
  if (context === undefined) {
    throw new Error('useMapLoading must be used within a MapLoadingProvider');
  }
  return context;
};
