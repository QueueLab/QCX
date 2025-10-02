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
      console.log('LocationResponseHandler: Received data', locationResponse);
      setMapData(prevData => ({
        ...prevData,
        geojson: geojson,
        mapCommands: map_commands,
      }));
    }
  }, [locationResponse, setMapData]);

  // This component handles logic and does not render any UI.
  return null;
};