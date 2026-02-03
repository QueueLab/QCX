'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
// Define the shape of the map data you want to share
export interface CameraState {
  center: { lat: number; lng: number };
  zoom?: number;
  pitch?: number;
  bearing?: number;
  range?: number;
  tilt?: number;
  heading?: number;
}

export interface ImageOverlay {
  id: string;
  url: string;
  coordinates: [[number, number], [number, number], [number, number], [number, number]]; // [NW, NE, SE, SW]
  opacity: number;
}

export interface MapData {
  targetPosition?: { lat: number; lng: number } | null; // For flying to a location
  cameraState?: CameraState; // For saving camera state
  currentTimezone?: string; // Current timezone identifier
  // TODO: Add other relevant map data types later (e.g., routeGeoJSON, poiList)
  mapFeature?: any | null; // Generic feature from MCP hook's processLocationQuery
  drawnFeatures?: Array<{ // Added to store drawn features and their measurements
    id: string;
    type: 'Polygon' | 'LineString';
    measurement: string;
    geometry: any;
  }>;
  markers?: Array<{
    latitude: number;
    longitude: number;
    title?: string;
  }>;
  imageOverlays?: ImageOverlay[];
}

interface MapDataContextType {
  mapData: MapData;
  setMapData: (data: MapData | ((prevData: MapData) => MapData)) => void;
}

const MapDataContext = createContext<MapDataContextType | undefined>(undefined);

export const MapDataProvider: React.FC<{ children: ReactNode; initialData?: MapData }> = ({ children, initialData }) => {
  const [mapData, setMapData] = useState<MapData>(initialData || { drawnFeatures: [], markers: [], imageOverlays: [] });

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
