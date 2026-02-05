'use client';

import { useEffect } from 'react';
import { useMapData } from './map-data-context'; 
import { useMapToggle, MapToggleEnum } from '../map-toggle-context';

// Define the expected structure of the mcp_response from geospatialTool
interface McpResponseData {
  location: {
    latitude?: number;
    longitude?: number;
    place_name?: string;
    address?: string;
  };
  mapUrl?: string;
}

interface ToolOutput {
  type: string;
  originalUserInput?: string;
  timestamp: string;
  mcp_response?: McpResponseData | null;
  features?: any[];
  error?: string | null;
}

interface MapQueryHandlerProps {
  toolOutput?: ToolOutput | null;
}

export const MapQueryHandler: React.FC<MapQueryHandlerProps> = ({ toolOutput }) => {
  const { setMapData } = useMapData();
  const { setMapType } = useMapToggle();

  useEffect(() => {
    if (!toolOutput) return;

    if (toolOutput.type === 'DRAWING_TRIGGER' && toolOutput.features) {
      console.log('MapQueryHandler: Received drawing data.', toolOutput.features);
      setMapType(MapToggleEnum.DrawingMode);
      setMapData(prevData => ({
        ...prevData,
        pendingFeatures: toolOutput.features
      }));
    } else if (toolOutput.type === 'MAP_QUERY_TRIGGER' && toolOutput.mcp_response && toolOutput.mcp_response.location) {
      const { latitude, longitude, place_name } = toolOutput.mcp_response.location;

      if (typeof latitude === 'number' && typeof longitude === 'number') {
        console.log(`MapQueryHandler: Received data from geospatialTool. Place: ${place_name}, Lat: ${latitude}, Lng: ${longitude}`);
        setMapData(prevData => ({
          ...prevData,
          targetPosition: { lat: latitude, lng: longitude },
          mapFeature: {
            place_name, 
            mapUrl: toolOutput.mcp_response?.mapUrl 
          } 
        }));
      }
    }
  }, [toolOutput, setMapData, setMapType]);

  return null;
};
