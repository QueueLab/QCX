'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

interface MapLoadingContextType {
  isMapLoaded: boolean;
  setIsMapLoaded: (isLoaded: boolean) => void;
  hasAppInitiallyLoaded: boolean;
}

const MapLoadingContext = createContext<MapLoadingContextType | undefined>(undefined);

export const MapLoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isMapLoaded, setIsMapLoadedState] = useState(false);
  const [hasAppInitiallyLoaded, setHasAppInitiallyLoaded] = useState(false);

  const setIsMapLoaded = (isLoaded: boolean) => {
    if (isLoaded && !hasAppInitiallyLoaded) {
      setIsMapLoadedState(true);
      setHasAppInitiallyLoaded(true);
    } else if (hasAppInitiallyLoaded) {
      setIsMapLoadedState(true); // Keep isMapLoaded true if app has initially loaded
    } else {
      setIsMapLoadedState(isLoaded);
    }
  };

  return (
    <MapLoadingContext.Provider value={{ isMapLoaded, setIsMapLoaded, hasAppInitiallyLoaded }}>
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
