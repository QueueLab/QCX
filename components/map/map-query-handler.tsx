'use client';

import { useEffect } from 'react';
import { useMapData } from './map-data-context';
import { LocationLinks } from './location-links';

interface Location {
  latitude: number;
  longitude: number;
  place_name: string;
}

interface McpResponseData {
  locations?: Location[]; // Support multiple locations
  location?: Location;    // Support single location
  mapUrl?: string;
}

interface GeospatialToolOutput {
  type: string;
  originalUserInput: string;
  timestamp: string;
  mcp_response: McpResponseData | null;
}

interface MapQueryHandlerProps {
  toolOutput?: GeospatialToolOutput | null;
}

export const MapQueryHandler: React.FC<MapQueryHandlerProps> = ({ toolOutput }) => {
  const { setMapData } = useMapData();

  useEffect(() => {
    if (toolOutput && toolOutput.mcp_response) {
      const { locations, location } = toolOutput.mcp_response;

      if (locations && locations.length > 1) {
        // Multiple locations: handled by LocationLinks, no automatic fly-to
      } else {
        const singleLocation = locations && locations.length === 1 ? locations[0] : location;
        if (singleLocation && typeof singleLocation.latitude === 'number' && typeof singleLocation.longitude === 'number') {
          setMapData(prevData => ({
            ...prevData,
            targetPosition: [singleLocation.longitude, singleLocation.latitude],
            mapFeature: {
              place_name: singleLocation.place_name,
              mapUrl: toolOutput.mcp_response?.mapUrl
            }
          }));
        }
      }
    }
  }, [toolOutput, setMapData]);

  if (toolOutput?.mcp_response?.locations && toolOutput.mcp_response.locations.length > 1) {
    return <LocationLinks locations={toolOutput.mcp_response.locations} />;
  }

  return null;
};
