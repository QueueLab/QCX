'use client';

import { useEffect } from 'react';
// Adjust path if necessary - assuming mapbox_mcp is at the root or configured in tsconfig paths
import { useMCPMapClient } from '@/mapbox_mcp/src/hooks'; 
import { useMapData } from './map-data-context'; 

interface MapQueryHandlerProps {
  originalUserInput: string;
}

export const MapQueryHandler: React.FC<MapQueryHandlerProps> = ({ originalUserInput }) => {
  const {
    connect,
    isConnected,
    processLocationQuery,
    isLoading: mcpLoading,
    error: mcpError,
    // We might need disconnect later if we manage connections per query handler instance
  } = useMCPMapClient();

  const { setMapData } = useMapData();

  useEffect(() => {
    // This effect handles the connection to the MCP client and processes the location query.

    const handleQueryProcessing = async () => {
      if (originalUserInput) {
        // console.log(`MapQueryHandler: Processing query: "${originalUserInput}"`);
        try {
          const response = await processLocationQuery(originalUserInput);
          // console.log("MapQueryHandler: MCP Response", response);

          if (response && response.mapLocation) {
            // console.log("MapQueryHandler: Setting map data with targetPosition:", response.mapLocation);
            setMapData(prevData => ({
              ...prevData,
              // Ensure coordinates are in [lng, lat] format for MapboxGL
              // Safely access .lng and .lat only if mapLocation is not null
              targetPosition: response.mapLocation ? [response.mapLocation.lng, response.mapLocation.lat] : null, 
              mapFeature: response.result // Store the whole result for potential other uses
            }));
          } else if (response && response.result) {
            // If there's no direct mapLocation, but there was a result (e.g., from toolInvocations)
            // store this information. The MapboxMap component might use it.
            // console.log("MapQueryHandler: Query processed, but no direct mapLocation. Full result:", response.result);
            setMapData(prevData => ({
              ...prevData,
              mapFeature: response.result,
              targetPosition: null, // Explicitly clear targetPosition if no mapLocation given
            }));
          }
        } catch (error) {
          console.error("MapQueryHandler: Error processing location query:", error);
          // Optionally set an error state in MapDataContext or show a toast
        }
      }
    };

    if (!isConnected) {
      // console.log("MapQueryHandler: MCP client not connected, attempting to connect.");
      connect().then(() => {
        // console.log("MapQueryHandler: Connected, now processing query.");
        // After connection, process the query.
        // Note: isConnected might not update immediately for this effect run,
        // so we proceed with query processing directly after successful connect promise.
        handleQueryProcessing();
      }).catch(connectionError => {
        console.error("MapQueryHandler: Error connecting MCP client:", connectionError);
      });
    } else {
      // If already connected, process the query directly.
      handleQueryProcessing();
    }
    
  }, [originalUserInput, isConnected, processLocationQuery, setMapData, connect]);

  // This component is a handler and does not render any visible UI itself.
  // Its purpose is to trigger map data updates based on AI tool results.
  // It could return a small status indicator or debug info if needed for development.
  return null; 
  // Example for debugging:
  // return <div data-map-query-processed={originalUserInput} data-mcp-loading={mcpLoading} data-mcp-error={mcpError} style={{display: 'none'}} />;
};
