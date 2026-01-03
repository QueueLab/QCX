import { useState, useCallback, useRef, useEffect } from 'react';
import { generateText } from 'ai';
import { getComposioClient, initializeComposioMapbox } from './composio-mapbox';

// Define Tool type locally if needed
type Tool = {
  name: string;
  // Add other properties as needed based on your usage
};
import { getModel } from '@/lib/utils';

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
 * Uses Composio SDK for authentication and tool execution.
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
    composioClientRef.current = getComposioClient();
  }, []);

  // Connect to Composio Mapbox
  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
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
      setError(`Failed to connect to Composio Mapbox: ${err}`);
      console.error('❌ Composio connection error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    toolsRef.current = null;
    setIsConnected(false);
    setConnectionId(null);
  }, []);

  const processLocationQuery = useCallback(async (query: string) => {
    if (!isConnected || !toolsRef.current) {
      throw new Error('Composio client not connected');
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await generateText({
        model: getModel(),
        tools: toolsRef.current,
        system: `You are an expert location data processing engine. Your role is to accurately use the available tools to answer location-based queries and provide structured data.
Available tools and their purpose:
- geocode_location: Converts addresses or place names to geographic coordinates. Also provides a map preview URL for the location.
- calculate_distance: Calculates the travel distance and duration between two locations for various profiles (driving, walking, cycling). Also provides a map preview URL for the route.
- search_nearby_places: Searches for points of interest (e.g., 'restaurants', 'gas stations') near a specified location. Provides details for each place including a map preview URL.
- generate_map_link: Generates static and interactive map links for a given location.

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
      setError(`Query processing failed: ${err}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

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
      setError(`Geocoding error: ${err}`);
      throw err;
    }
  }, [isConnected, connectionId]);

  const calculateDistance = useCallback(async (from: string, to: string, profile: 'driving' | 'walking' | 'cycling' = 'driving'): Promise<DistanceResult> => {
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
      setError(`Distance calculation error: ${err}`);
      throw err;
    }
  }, [isConnected, connectionId]);

  const searchNearbyPlaces = useCallback(async (location: string, query: string, radius: number = 1000, limit: number = 5): Promise<PlaceResult> => {
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
      setError(`Places search error: ${err}`);
      throw err;
    }
  }, [isConnected, connectionId]);

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
