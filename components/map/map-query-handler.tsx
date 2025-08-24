'use client';

import { useEffect } from 'react';
// Removed useMCPMapClient as we'll use data passed via props
import { useMapData } from './map-data-context'; 

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

interface GeospatialToolOutput {
  type: string; // e.g., "MAP_QUERY_TRIGGER"
  originalUserInput: string;
  timestamp: string;
  mcp_response: McpResponseData | null;
}

interface MapQueryHandlerProps {
  // originalUserInput: string; // Kept for now, but primary data will come from toolOutput
  toolOutput?: GeospatialToolOutput | null; // The direct output from geospatialTool
}

export const MapQueryHandler: React.FC<MapQueryHandlerProps> = ({ toolOutput }) => {
  const { setMapData } = useMapData();

  useEffect(() => {
    console.log('[MapQueryHandler] useEffect triggered. toolOutput:', JSON.stringify(toolOutput, null, 2));

    if (toolOutput && toolOutput.mcp_response && toolOutput.mcp_response.location) {
      const { latitude, longitude, place_name } = toolOutput.mcp_response.location;

      if (typeof latitude === 'number' && typeof longitude === 'number') {
        const newMapData = {
          targetPosition: [longitude, latitude] as [number, number],
          mapFeature: {
            place_name,
            mapUrl: toolOutput.mcp_response?.mapUrl,
          },
        };
        console.log('[MapQueryHandler] Calling setMapData with:', JSON.stringify(newMapData, null, 2));
        setMapData(prevData => ({
          ...prevData,
          ...newMapData,
        }));
      } else {
        console.warn('[MapQueryHandler] Invalid latitude/longitude in toolOutput.mcp_response:', toolOutput.mcp_response.location);
        setMapData(prevData => ({
          ...prevData,
          targetPosition: null,
          mapFeature: null,
        }));
      }
    } else {
      if (toolOutput) {
        console.warn('[MapQueryHandler] toolOutput provided, but mcp_response or location data is missing.', toolOutput);
      } else {
        console.log('[MapQueryHandler] toolOutput is null or undefined.');
      }
    }
  }, [toolOutput, setMapData]);

  // This component is a handler and does not render any visible UI itself.
  // Its purpose is to trigger map data updates based on AI tool results.
  // If it were to use the old useMCPMapClient, mcpLoading and mcpError would be relevant.
  // It could return a small status indicator or debug info if needed for development.
  return null;
  // Example for debugging with previous client:
  // return <div data-map-query-processed={originalUserInput} data-mcp-loading={mcpLoading} data-mcp-error={mcpError} style={{display: 'none'}} />;
};
