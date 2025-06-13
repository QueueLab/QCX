'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import mapboxgl, { LngLatLike } from 'mapbox-gl'; // Import LngLatLike and mapboxgl

// Define the shape of the map data you want to share
export interface MapData {
  targetPosition?: LngLatLike | null; // For flying to a location
  // TODO: Add other relevant map data types later (e.g., routeGeoJSON, poiList)
  mapFeature?: any | null; // Generic feature from MCP hook's processLocationQuery
  drawnFeatures?: Array<{ // Added to store drawn features and their measurements
    id: string;
    type: 'Polygon' | 'LineString';
    measurement: string;
    geometry: any;
  }>;
  mapInstance?: mapboxgl.Map | null;
  viewport?: { center: [number, number]; zoom: number; pitch: number; bearing: number };
}

interface MapDataContextType {
  mapData: MapData;
  setMapData: (data: MapData | ((prevData: MapData) => MapData)) => void;
}

const MapDataContext = createContext<MapDataContextType | undefined>(undefined);

export const MapDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mapData, setMapData] = useState<MapData>({
    drawnFeatures: [],
    mapInstance: null,
    viewport: {
      center: [0, 0],
      zoom: 2,
      pitch: 0,
      bearing: 0,
    },
  });

  return (
    <MapDataContext.Provider value={{ mapData, setMapData }}>
      {children}
    </MapDataContext.Provider>
  );
};

export const useMapData = (): MapDataContextType => {
  const context = useContext(MapDataContext);
  if (!context) {
    throw new Error('useMapData must be used within a MapDataProvider');
  }
  return context;
};
