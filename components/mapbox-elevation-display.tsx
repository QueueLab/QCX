'use client';

import { useEffect } from 'react';
import { useMapData } from './map/map-data-context';
import Image from 'next/image';

interface ElevationData {
  latitude: number;
  longitude: number;
  elevation: number;
  mapUrl?: string;
}

interface ElevationToolOutput {
  type: string;
  originalUserInput: string;
  timestamp: string;
  elevation_response: ElevationData | null;
}

interface MapboxElevationDisplayProps {
  toolOutput?: ElevationToolOutput | null;
}

export const MapboxElevationDisplay: React.FC<MapboxElevationDisplayProps> = ({ toolOutput }) => {
  const { setMapData } = useMapData();

  useEffect(() => {
    if (toolOutput && toolOutput.elevation_response) {
      const { latitude, longitude } = toolOutput.elevation_response;
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        setMapData(prevData => ({
          ...prevData,
          targetPosition: [longitude, latitude],
        }));
      }
    }
  }, [toolOutput, setMapData]);

  if (!toolOutput || !toolOutput.elevation_response) {
    return null;
  }

  const { elevation, mapUrl } = toolOutput.elevation_response;

  return (
    <div className="bg-zinc-900 border-zinc-700 border rounded-lg p-4 my-4">
      <h3 className="text-lg font-semibold text-white">Elevation Information (Mapbox)</h3>
      <p className="text-zinc-300">Elevation: {elevation} meters</p>
      {mapUrl && (
        <div className="mt-4">
          <Image
            src={mapUrl}
            alt="Map preview"
            width={600}
            height={400}
            className="rounded-lg"
          />
        </div>
      )}
    </div>
  );
};
