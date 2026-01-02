'use client';

import { useEffect } from 'react';
import { useMapData } from './map-data-context';
import { LocationResponse } from '@/lib/types/custom';

interface LocationResponseHandlerProps {
  locationResponse: LocationResponse;
}

export const LocationResponseHandler: React.FC<LocationResponseHandlerProps> = ({ locationResponse }) => {
  const { setMapData } = useMapData();

  useEffect(() => {
    if (locationResponse) {
      const { geojson, map_commands } = locationResponse;
      console.log('📍 LocationResponseHandler: Received data', {
        hasGeoJSON: !!geojson,
        featureCount: geojson?.features?.length || 0,
        hasCommands: !!map_commands,
        commandCount: map_commands?.length || 0,
        commands: map_commands?.map(c => c.command),
        fullResponse: locationResponse,
      });
      
      if (geojson || map_commands) {
        console.log('📍 LocationResponseHandler: Setting map data...');
        setMapData(prevData => {
          const newData = {
            ...prevData,
            geojson: geojson,
            mapCommands: map_commands,
          };
          console.log('📍 LocationResponseHandler: New map data:', newData);
          return newData;
        });
      } else {
        console.warn('⚠️ LocationResponseHandler: No geojson or commands to set');
      }
    } else {
      console.warn('⚠️ LocationResponseHandler: No locationResponse provided');
    }
  }, [locationResponse, setMapData]);

  // This component handles logic and does not render any UI.
  return null;
};