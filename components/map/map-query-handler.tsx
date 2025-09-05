'use client';

import { useEffect } from 'react';
// Removed useMCPMapClient as we'll use data passed via props
import { useMapData, MapData } from './map-data-context'; 

// Define the expected structure of the mcp_response from geospatialTool
type McpResponseData = any;

interface GeospatialToolOutput {
  type: string;
  originalUserInput: string;
  timestamp: string;
  queryType: string;
  mcp_response: McpResponseData | null;
  error?: string;
}

interface MapQueryHandlerProps {
  // originalUserInput: string; // Kept for now, but primary data will come from toolOutput
  toolOutput?: GeospatialToolOutput | null; // The direct output from geospatialTool
}

export const MapQueryHandler: React.FC<MapQueryHandlerProps> = ({ toolOutput }) => {
  const { setMapData } = useMapData();

  useEffect(() => {
    if (toolOutput && toolOutput.mcp_response && toolOutput.mcp_response.location) {
      const { latitude, longitude, place_name } = toolOutput.mcp_response.location;

      if (typeof latitude === 'number' && typeof longitude === 'number') {
        console.log(`MapQueryHandler: Received data from geospatialTool. Place: ${place_name}, Lat: ${latitude}, Lng: ${longitude}`);
        setMapData(prevData => ({
          ...prevData,
          // Ensure coordinates are in [lng, lat] format for MapboxGL
          targetPosition: [longitude, latitude], 
          // Optionally store more info from mcp_response if needed by MapboxMap component later
          mapFeature: { 
            place_name, 
            // Potentially add mapUrl or other details from toolOutput.mcp_response
            mapUrl: toolOutput.mcp_response?.mapUrl 
          } 
        }));
      } else {
        console.warn("MapQueryHandler: Invalid latitude/longitude in toolOutput.mcp_response:", toolOutput.mcp_response.location);
        // Clear target position if data is invalid
        setMapData(prevData => ({
          ...prevData,
          targetPosition: null,
          mapFeature: null
        }));
      }
    } else {
      // This case handles when toolOutput or its critical parts are missing.
      // Depending on requirements, could fall back to originalUserInput and useMCPMapClient,
      // or simply log that no valid data was provided from the tool.
      // For this subtask, we primarily focus on using the new toolOutput.
      if (toolOutput) { // It exists, but data is not as expected
        console.warn("MapQueryHandler: toolOutput provided, but mcp_response or location data is missing.", toolOutput);
      }
      // If toolOutput is null/undefined, this component might not need to do anything,
      // or it's an indication that it shouldn't have been rendered/triggered.
      // For now, if no valid toolOutput, we clear map data or leave it as is.
      // setMapData(prevData => ({ ...prevData, targetPosition: null, mapFeature: null }));
    }
    // The dependencies for this useEffect should be based on the props that trigger its logic.
    // If originalUserInput and the old MCP client were still used as a fallback, they'd be dependencies.
  }, [toolOutput, setMapData]);

  // This component is a handler and does not render any visible UI itself.
  // Its purpose is to trigger map data updates based on AI tool results.
  // If it were to use the old useMCPMapClient, mcpLoading and mcpError would be relevant.
  // It could return a small status indicator or debug info if needed for development.
  return null;
  // Example for debugging with previous client:
  // return <div data-map-query-processed={originalUserInput} data-mcp-loading={mcpLoading} data-mcp-error={mcpError} style={{display: 'none'}} />;
};
