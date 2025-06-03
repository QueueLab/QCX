import { useState, useCallback, useRef } from 'react';
import { experimental_createMCPClient, generateText } from 'ai';
import { getModel } from 'QCX/lib/utils';

// Types for location and mapping data
// These interfaces define the expected structure for results from the MCP server tools.
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
 * Custom React hook to interact with the Mapbox MCP (Model Context Protocol) server.
 * Manages client connection, tool invocation, and state (loading, error, connection status).
 * Uses Vercel AI SDK's `experimental_createMCPClient` for communication.
 */
export const useMCPMapClient = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Holds error messages from MCP operations; set by various functions if errors occur.
  const [error, setError] = useState<string | null>(null); 
  
  // Refs to hold the MCP client instance and available tools.
  // Using refs allows these values to persist across re-renders without triggering them.
  const clientRef = useRef<any>(null); // Stores the MCP client instance once connected.
  const toolsRef = useRef<any>(null);  // Stores the map of available tools fetched from the server.

  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Initialize the MCP client using Server-Sent Events (SSE) transport.
      // The URL must include NEXT_PUBLIC_ prefixed environment variables for Smithery profile ID and API key,
      // as this hook is intended for client-side usage in a Next.js application.
      const client = await experimental_createMCPClient({
        transport: { // Configuration for the transport layer
          type: 'sse', // Specifies Server-Sent Events as the transport type
          // Constructs the full SSE URL including authentication parameters (profile ID and API key)
          url: `https://server.smithery.ai/@ngoiyaeric/mapbox-mcp-server/mcp?profile=${process.env.NEXT_PUBLIC_SMITHERY_PROFILE_ID}&api_key=${process.env.NEXT_PUBLIC_SMITHERY_API_KEY}`,
        },
      });
      const tools = await client.tools(); // Fetches the available tools from the MCP server
      clientRef.current = client; // Store the client instance in the ref
      toolsRef.current = tools;  // Store the fetched tools in the ref
      setIsConnected(true);
      console.log('✅ Connected to MCP server');
      console.log('Available tools:', Object.keys(tools));
    } catch (err) {
      const profileId = process.env.NEXT_PUBLIC_SMITHERY_PROFILE_ID;
      const apiKey = process.env.NEXT_PUBLIC_SMITHERY_API_KEY;
      const url = `https://server.smithery.ai/@ngoiyaeric/mapbox-mcp-server/mcp?profile=${profileId}&api_key=${apiKey ? '********' + apiKey.slice(-4) : 'NOT_SET'}`;

      console.error('❌ MCP connection error details:');
      console.error(`Attempted URL (API key masked): ${url.replace(/api_key=([^&]+)/, 'api_key=********')}`);
      console.error(`NEXT_PUBLIC_SMITHERY_PROFILE_ID: ${profileId || 'NOT_SET'}`);
      console.error(`NEXT_PUBLIC_SMITHERY_API_KEY (masked): ${apiKey ? apiKey.substring(0, 4) + '********' + apiKey.slice(-4) : 'NOT_SET'}`);

      setError(`Failed to connect to MCP server. Please check console for details. Error: ${err}`);
      console.error('Original error object:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.close();
      clientRef.current = null;
      toolsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const processLocationQuery = useCallback(async (query: string) => {
    if (!isConnected || !toolsRef.current) {
      throw new Error('MCP client not connected');
    }
    setIsLoading(true);
    setError(null); // Clear any previous errors before processing a new query
    try {
      // Use the `generateText` function from the AI SDK to interact with the model.
      // This function can leverage the tools provided by the MCP server.
      const response = await generateText({
        model: getModel(), // Ensure getModel() is appropriate here or use a specific one
        tools: toolsRef.current, // Provides the available MCP tools to the AI model
        system: `You are an expert location data processing engine. Your role is to accurately use the available tools to answer location-based queries and provide structured data.
Available tools and their purpose:
- geocode_location: Converts addresses or place names to geographic coordinates. Also provides a map preview URL for the location.
- calculate_distance: Calculates the travel distance and duration between two locations for various profiles (driving, walking, cycling). Also provides a map preview URL for the route.
- search_nearby_places: Searches for points of interest (e.g., 'restaurants', 'gas stations') near a specified location. Provides details for each place including a map preview URL.
- generate_map_link: Generates static and interactive map links for a given location.

For any user query, determine the most appropriate tool or sequence of tools to achieve the user's goal.
Prioritize calling tools to get structured data. The text response you generate should summarize the findings and must include any relevant map URLs or key information provided by the tools.
Focus on extracting and presenting factual data from the tools.`,
        messages: [ // System message is now part of the generateText call directly
          { // The user's actual query.
            role: 'user',
            content: query,
          },
        ],
        maxSteps: 5, // Increased maxSteps slightly for potentially more complex tool sequences
      });

      // Heuristics to determine if the response suggests a map should be shown
      // and to extract coordinates if present in the model's textual response.
      let mapLocation = null; // Object to hold {lat, lng, zoom} if coordinates are found.
      let shouldShowMap = false; // Flag to indicate if the UI should attempt to show a map.
      
      // Regex to find patterns like "latitude, longitude" in the response text.
      const coordPattern = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/; 
      const coordMatch = response.text.match(coordPattern);
      if (coordMatch) { // If coordinates are found in the text
        mapLocation = {
          lat: parseFloat(coordMatch[1]), // Parsed latitude
          lng: parseFloat(coordMatch[2]), // Parsed longitude
          zoom: 12, // Default zoom level for the map
        };
        shouldShowMap = true; // Indicate that a map can be shown
      }
      // Additional heuristic: if the response text contains map-related keywords, also suggest showing the map.
      if (
        response.text.toLowerCase().includes('map') ||
        response.text.toLowerCase().includes('location') ||
        response.text.toLowerCase().includes('coordinate')
      ) {
        shouldShowMap = true;
      }

      const typedResponse = response as typeof response & { toolInvocations?: any };
      return { // The structured response from this function
        result: { // Core AI response details
          text: typedResponse.text,
          toolInvocations: typedResponse.toolInvocations,
          finishReason: typedResponse.finishReason,
        },
        mapLocation, // Coordinates for map display, if found
        shouldShowMap, // Whether the UI should consider showing a map
      };
    } catch (err) {
      setError(`Query processing failed: ${err}`); // Update error state if query processing fails
      throw err; // Re-throw the error for the calling component to potentially handle
    } finally {
      setIsLoading(false); // Ensure loading state is reset
    }
  }, [isConnected]);

  const geocodeLocation = useCallback(async (address: string): Promise<LocationResult> => {
    if (!isConnected || !clientRef.current) {
      throw new Error('MCP client not connected');
    }
    try {
      const result = await clientRef.current.callTool('geocode_location', {
        query: address,
        includeMapPreview: true,
      });
      // The MCP server tools (like geocode_location) are expected to return structured data
      // as a JSON string embedded within a markdown code block in the second content item (`result.content[1]`).
      // This line attempts to extract that JSON string.
      const match = result.content[1]?.text?.match(/```json\n([\s\S]*?)\n```/);
      // Parses the extracted JSON string. Returns an empty object if no match or parsing fails.
      return JSON.parse(match?.[1] || '{}'); 
      
    } catch (err) {
      console.error('Geocoding error:', err);
      setError(`Geocoding error: ${err}`); // Sets the error state for the hook
      throw err; // Re-throws the error for the component to handle if necessary
    }
  }, [isConnected, setError]);

  const calculateDistance = useCallback(async (from: string, to: string, profile: 'driving' | 'walking' | 'cycling' = 'driving'): Promise<DistanceResult> => {
    if (!isConnected || !clientRef.current) {
      throw new Error('MCP client not connected');
    }
    try {
      const result = await clientRef.current.callTool('calculate_distance', {
        from,
        to,
        profile,
        includeRouteMap: true,
      });
      // Similar to geocodeLocation, parses the JSON result from a markdown code block in the response.
      return JSON.parse(result.content[1]?.text?.match(/```json\n(.*?)\n```/s)?.[1] || '{}');
    } catch (err) {
      console.error('Distance calculation error:', err);
      setError(`Distance calculation error: ${err}`); // Sets the hook's error state
      throw err; // Re-throws for potential component-level error handling
    }
  }, [isConnected, setError]);

  const searchNearbyPlaces = useCallback(async (location: string, query: string, radius: number = 1000, limit: number = 5): Promise<PlaceResult> => {
    if (!isConnected || !clientRef.current) {
      throw new Error('MCP client not connected');
    }
    try {
      const result = await clientRef.current.callTool('search_nearby_places', {
        location,
        query,
        radius,
        limit,
      });
      // Parses the JSON result from a markdown code block.
      return JSON.parse(result.content[1]?.text?.match(/```json\n(.*?)\n```/s)?.[1] || '{}');
    } catch (err) {
      console.error('Places search error:', err);
      setError(`Places search error: ${err}`); // Sets the hook's error state
      throw err;
    }
  }, [isConnected, setError]);

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
