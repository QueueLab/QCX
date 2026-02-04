import { useState, useCallback, useRef, useEffect } from 'react';
import { generateText } from 'ai';
import { getModel } from '@/lib/utils/ai-model';

// Define Tool type locally if needed
type Tool = {
  name: string;
  // Add other properties as needed based on your usage
};

// Types for location and mapping data
interface LocationResult {
  location: {
    latitude: number;
    longitude: number;
    place_name?: string;
    address?: string;
  };
  mapUrl?: string;
}

interface DistanceResult {
  from: { latitude: number; longitude: number; address: string };
  to: { latitude: number; longitude: number; address: string };
  distance: number;
  duration: number;
  profile: string;
  mapUrl?: string;
}

interface PlaceResult {
  places: Array<{
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    mapUrl: string;
  }>;
}

/**
 * Custom React hook to interact with Mapbox via Composio.
 * Manages client connection, tool invocation, and state (loading, error, connection status).
 * 
 * WARNING: This hook should NOT be used directly in client components as it requires
 * server-side environment variables (MAPBOX_ACCESS_TOKEN). Instead, create a server-side
 * API route that handles Composio authentication and tool execution.
 */
export const useMCPMapClient = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  // Refs to hold available tools and Composio client
  const toolsRef = useRef<any>(null);
  const composioClientRef = useRef<any>(null);

  // Initialize Composio client on mount
  useEffect(() => {
    // Import dynamically to avoid bundling server-side code in client
    const initClient = async () => {
      try {
        const { getComposioClient } = await import('./composio-mapbox');
        composioClientRef.current = getComposioClient();
      } catch (err) {
        console.error('Failed to initialize Composio client:', err);
        setError('Failed to initialize Composio client. This may be due to missing environment variables.');
      }
    };
    initClient();
  }, []);

  // Connect to Composio Mapbox - should be called from server-side
  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Import server-side function
      const { initializeComposioMapbox } = await import('./composio-mapbox');
      const { connectionId: connId, connectedAccount } = await initializeComposioMapbox();
      setConnectionId(connId);
      
      // Get available tools from Composio
      if (composioClientRef.current) {
        const tools = await composioClientRef.current.getTools({
          apps: ['mapbox']
        });
        toolsRef.current = tools;
      }
      
      setIsConnected(true);
      console.log('✅ Connected to Composio Mapbox');
      console.log('Connection ID:', connId);
    } catch (err) {
      const errorMessage = `Failed to connect to Composio Mapbox: ${err}`;
      setError(errorMessage);
      console.error('❌ Composio connection error:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps - function doesn't depend on external state

  const disconnect = useCallback(async () => {
    try {
      // Clean up Composio connection if it exists
      if (composioClientRef.current && connectionId) {
        // Note: Composio SDK may not have a direct disconnect method for connected accounts
        // This is a placeholder for proper cleanup if the SDK provides it
        console.log('Disconnecting from Composio...');
      }
      
      toolsRef.current = null;
      setIsConnected(false);
      setConnectionId(null);
    } catch (err) {
      console.error('Error during disconnect:', err);
    }
  }, [connectionId]); // Depends on connectionId

  const processLocationQuery = useCallback(async (query: string) => {
    if (!isConnected || !toolsRef.current) {
      throw new Error('Composio client not connected');
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await generateText({
        model: await getModel(),
        tools: toolsRef.current,
        system: `You are an expert location data processing engine. Your role is to accurately use the available tools to answer location-based queries and provide structured data.

Available tools and their purpose:
- mapbox_geocode_location: Converts addresses or place names to geographic coordinates. Also provides a map preview URL for the location.
- mapbox_calculate_distance: Calculates the travel distance and duration between two locations for various profiles (driving, walking, cycling). Also provides a map preview URL for the route.
- mapbox_search_nearby_places: Searches for points of interest (e.g., 'restaurants', 'gas stations') near a specified location. Provides details for each place including a map preview URL.
- mapbox_generate_map_link: Generates static and interactive map links for a given location.

For any user query, determine the most appropriate tool or sequence of tools to achieve the user's goal.
Prioritize calling tools to get structured data. The text response you generate should summarize the findings and must include any relevant map URLs or key information provided by the tools.
Focus on extracting and presenting factual data from the tools.`,
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
        maxSteps: 5,
      });

      let mapLocation = null;
      let shouldShowMap = false;
      const coordPattern = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
      const coordMatch = response.text.match(coordPattern);
      if (coordMatch) {
        mapLocation = {
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2]),
          zoom: 12,
        };
        shouldShowMap = true;
      }
      if (
        response.text.toLowerCase().includes('map') ||
        response.text.toLowerCase().includes('location') ||
        response.text.toLowerCase().includes('coordinate')
      ) {
        shouldShowMap = true;
      }

      const typedResponse = response as typeof response & { toolInvocations?: any };
      return {
        result: {
          text: typedResponse.text,
          toolInvocations: typedResponse.toolInvocations,
          finishReason: typedResponse.finishReason,
        },
        mapLocation,
        shouldShowMap,
      };
    } catch (err) {
      const errorMessage = `Query processing failed: ${err}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]); // Depends on isConnected

  const geocodeLocation = useCallback(async (address: string): Promise<LocationResult> => {
    if (!isConnected || !composioClientRef.current || !connectionId) {
      throw new Error('Composio client not connected');
    }
    try {
      const result = await composioClientRef.current.executeAction({
        action: 'mapbox_geocode_location',
        params: {
          query: address,
          includeMapPreview: true,
        },
        connectedAccountId: connectionId,
      });
      return result.data;
    } catch (err) {
      console.error('Geocoding error:', err);
      const errorMessage = `Geocoding error: ${err}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [isConnected, connectionId]); // Depends on isConnected and connectionId

  const calculateDistance = useCallback(async (
    from: string,
    to: string,
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Promise<DistanceResult> => {
    if (!isConnected || !composioClientRef.current || !connectionId) {
      throw new Error('Composio client not connected');
    }
    try {
      const result = await composioClientRef.current.executeAction({
        action: 'mapbox_calculate_distance',
        params: {
          from,
          to,
          profile,
          includeRouteMap: true,
        },
        connectedAccountId: connectionId,
      });
      return result.data;
    } catch (err) {
      console.error('Distance calculation error:', err);
      const errorMessage = `Distance calculation error: ${err}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [isConnected, connectionId]); // Depends on isConnected and connectionId

  const searchNearbyPlaces = useCallback(async (
    location: string,
    query: string,
    radius: number = 1000,
    limit: number = 5
  ): Promise<PlaceResult> => {
    if (!isConnected || !composioClientRef.current || !connectionId) {
      throw new Error('Composio client not connected');
    }
    try {
      const result = await composioClientRef.current.executeAction({
        action: 'mapbox_search_nearby_places',
        params: {
          location,
          query,
          radius,
          limit,
        },
        connectedAccountId: connectionId,
      });
      return result.data;
    } catch (err) {
      console.error('Places search error:', err);
      const errorMessage = `Places search error: ${err}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [isConnected, connectionId]); // Depends on isConnected and connectionId

  return {
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    processLocationQuery,
    geocodeLocation,
    calculateDistance,
    searchNearbyPlaces,
  };
};
