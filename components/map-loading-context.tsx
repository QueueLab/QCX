'use client';
import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';

interface MapLoadingContextType {
  isMapLoaded: boolean;
  setIsMapLoaded: (isLoaded: boolean) => void;
}

const MapLoadingContext = createContext<MapLoadingContextType | undefined>(undefined);

export const MapLoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const setIsMapLoadedCallback = useCallback((isLoaded: boolean) => {
    setIsMapLoaded(isLoaded);
  }, []);

  const value = useMemo(() => ({
    isMapLoaded,
    setIsMapLoaded: setIsMapLoadedCallback
  }), [isMapLoaded, setIsMapLoadedCallback]);

  return (
    <MapLoadingContext.Provider value={value}>
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
