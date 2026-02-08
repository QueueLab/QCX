'use client';

import { useEffect } from 'react';
import { useMapData } from './map-data-context'; 
import { useMapToggle, MapToggleEnum } from '../map-toggle-context';
import { ToolOutput } from '@/lib/types/tools';

interface MapQueryHandlerProps {
  toolOutput?: ToolOutput | null;
}

export const MapQueryHandler: React.FC<MapQueryHandlerProps> = ({ toolOutput }) => {
  const { setMapData } = useMapData();
  const { setMapType } = useMapToggle();

  useEffect(() => {
    if (!toolOutput) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('MapQueryHandler: missing toolOutput');
      }
      return;
    }

    if (toolOutput.type === 'DRAWING_TRIGGER' && toolOutput.features) {
      console.log('MapQueryHandler: Received drawing data.', toolOutput.features);
      setMapType(MapToggleEnum.DrawingMode);
      setMapData(prevData => ({
        ...prevData,
        pendingFeatures: toolOutput.features
      }));
    } else if (toolOutput.type === 'MAP_QUERY_TRIGGER') {
      if (toolOutput.mcp_response && toolOutput.mcp_response.location) {
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
        } else {
          console.warn('MapQueryHandler: invalid MAP_QUERY_TRIGGER payload', { toolOutput, mcp_response: toolOutput.mcp_response });
        }
      } else {
        console.warn('MapQueryHandler: invalid MAP_QUERY_TRIGGER payload', { toolOutput, mcp_response: toolOutput?.mcp_response });
      }
    }
  }, [toolOutput, setMapData, setMapType]);

  return null;
};
