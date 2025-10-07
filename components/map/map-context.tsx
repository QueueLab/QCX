'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import type { Map as MapboxMap } from 'mapbox-gl'

// A more direct context to hold the map instance itself.
type MapContextType = {
  map: MapboxMap | null;
  setMap: (map: MapboxMap | null) => void;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [map, setMap] = useState<MapboxMap | null>(null);

  return (
    <MapContext.Provider value={{ map, setMap }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = (): MapContextType => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};