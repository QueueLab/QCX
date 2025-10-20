import { useState, useCallback, useRef } from 'react';
import { generateText, CoreMessage } from 'ai';
import { useMcp } from 'use-mcp/react';
import { getModel } from '@/lib/utils';
import { z } from 'zod';


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
const safeParseJson = (jsonString: string, fallback: any = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('JSON parsing failed:', e);
    return fallback;
  }
};
/**
 * Custom React hook to interact with the Mapbox MCP server.
 * Manages client connection, tool invocation, and state (loading, error, connection status).
 * Uses `useMcp` from 'use-mcp/react' for communication.
 */
export const useMCPMapClient = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to hold available tools
  const toolsRef = useRef<any>(null);

  // Configure MCP client using useMcp hook
  const mcp = useMcp({
    //https://server.smithery.ai/@Waldzell-Agentics/mcp-server/mcp
    url: `https://server.smithery.ai/@Waldzell-Agentics/mcp-server/mcp?profile=${process.env.NEXT_PUBLIC_SMITHERY_PROFILE_ID}&api_key=${process.env.NEXT_PUBLIC_SMITHERY_API_KEY}`,
    debug: process.env.NODE_ENV === 'development',
    autoReconnect: true,
    autoRetry: 5000,
  });

  // Update connection status based on MCP state
  const connect = useCallback(async () => {
    if (mcp.state === 'ready') {
      try {
        setIsLoading(true);
        setError(null);
        toolsRef.current = mcp.tools.reduce((acc: any, tool: any) => {
          acc[tool.name] = tool;
          return acc;
        }, {});
        setIsConnected(true);
        console.log('✅ Connected to MCP server');
        console.log('Available tools:', Object.keys(toolsRef.current));
      } catch (err) {
        setError(`Failed to connect to MCP server: ${err}`);
        console.error('❌ MCP connection error:', err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [mcp.state, mcp.tools]);

  const disconnect = useCallback(async () => {
    if (mcp.state === 'ready') {
      await mcp.disconnect();
      toolsRef.current = null;
      setIsConnected(false);
    }
  }, [mcp.state]);

  const processLocationQuery = useCallback(async (query: string) => {
    if (mcp.state !== 'ready' || !toolsRef.current) {
      throw new Error('MCP client not connected');
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
  }, [mcp.state]);

  const geocodeLocation = useCallback(async (address: string): Promise<LocationResult> => {
    if (mcp.state !== 'ready') {
      throw new Error('MCP client not connected');
    }
    try {
      const result = await mcp.callTool('geocode_location', {
        query: address,
        includeMapPreview: true,
      });
      if (result.content[1]?.json) {
        return result.content[1].json;
      }
      const match = result.content[1]?.text?.match(/```json\n([\s\S]*?)\n```/);
      return safeParseJson(match?.[1]);
    } catch (err) {
      console.error('Geocoding error:', err);
      setError(`Geocoding error: ${err}`);
      throw err;
    }
  }, [mcp.state, mcp.callTool]);

  const calculateDistance = useCallback(async (from: string, to: string, profile: 'driving' | 'walking' | 'cycling' = 'driving'): Promise<DistanceResult> => {
    if (mcp.state !== 'ready') {
      throw new Error('MCP client not connected');
    }
    try {
      const result = await mcp.callTool('calculate_distance', {
        from,
        to,
        profile,
        includeRouteMap: true,
      });
      if (result.content[1]?.json) {
        return result.content[1].json;
      }
      return safeParseJson(result.content[1]?.text?.match(/```json\n(.*?)\n```/s)?.[1]);
    } catch (err) {
      console.error('Distance calculation error:', err);
      setError(`Distance calculation error: ${err}`);
      throw err;
    }
  }, [mcp.state, mcp.callTool]);

  const searchNearbyPlaces = useCallback(async (location: string, query: string, radius: number = 1000, limit: number = 5): Promise<PlaceResult> => {
    if (mcp.state !== 'ready') {
      throw new Error('MCP client not connected');
    }
    try {
      const result = await mcp.callTool('search_nearby_places', {
        location,
        query,
        radius,
        limit,
      });
      if (result.content[1]?.json) {
        return result.content[1].json;
      }
      return safeParseJson(result.content[1]?.text?.match(/```json\n(.*?)\n```/s)?.[1]);
    } catch (err) {
      console.error('Places search error:', err);
      setError(`Places search error: ${err}`);
      throw err;
    }
  }, [mcp.state, mcp.callTool]);

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
