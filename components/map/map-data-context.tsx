'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LngLatLike } from 'mapbox-gl'; // Import LngLatLike

// Define the BoundingBox interface
export interface BoundingBox {
  northEast: { lat: number; lon: number; };
  southWest: { lat: number; lon: number; };
}

// Define the shape of the map data you want to share
export interface MapData {
  targetPosition?: LngLatLike | null; // For flying to a location
  // TODO: Add other relevant map data types later (e.g., routeGeoJSON, poiList)
  mapFeature?: any | null; // Generic feature from MCP hook's processLocationQuery
  attachedImage?: string | File | null; // Field for the attached image
  imageBoundingBox?: BoundingBox | null; // Bounding box for the attached image
  error?: string | null; // Error messages, e.g., from AI processing
}

interface MapDataContextType {
  mapData: MapData;
  setMapData: (data: MapData | ((prevData: MapData) => MapData)) => void;
}

const MapDataContext = createContext<MapDataContextType | undefined>(undefined);

export const MapDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mapData, setMapData] = useState<MapData>({});

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
