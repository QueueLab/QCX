'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LngLatLike } from 'mapbox-gl'; // Import LngLatLike\nimport type * as GeoJSON from 'geojson';

// Define the shape of the map data you want to share
export interface MapData {
  targetPosition?: LngLatLike | null;
  routeGeoJSON?: GeoJSON.Feature<GeoJSON.LineString> | null;
  markers?: Array<{ lat: number; lng: number; name?: string; address?: string }>;
  polygons?: Array<GeoJSON.Feature<GeoJSON.Polygon>>;
  drawnFeatures?: Array<{ id: string; type: 'Polygon' | 'LineString'; measurement: string; geometry: any }>;
}

interface MapDataContextType {
  mapData: MapData;
  setMapData: (data: MapData | ((prevData: MapData) => MapData)) => void;
}

const MapDataContext = createContext<MapDataContextType | undefined>(undefined);

export const MapDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mapData, setMapData] = useState<MapData>({ drawnFeatures: [] });

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
