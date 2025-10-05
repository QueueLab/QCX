'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import type { Map } from 'mapbox-gl'

// A more direct context to hold the map instance itself.
type MapContextType = {
  map: Map | null;
  setMap: (map: Map | null) => void;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider = ({ children }: { children: ReactNode }) => {
  const [map, setMap] = useState<Map | null>(null);

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