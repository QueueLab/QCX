import { useState, useCallback, useEffect } from 'react';
import { generateText, streamText, CoreMessage, ToolDefinition as AISdkToolDefinition } from 'ai';
import { getModel } from 'QCX/lib/utils'; // Assuming this provides the main LLM
import { getAdaptedSmitheryTools } from '@/lib/smithery-tools-for-ai-sdk'; // New import
import { z } from 'zod';

// Types for location and mapping data - these might need to align with what Smithery tools now return via the new client
export interface LocationResult {
  latitude: number;
  longitude: number;
  place_name?: string; // from original Mapbox response structure
  address?: string; // from original Mapbox response structure
  query?: string; // To store the input query
  timestamp?: number;
  mapUrl?: string;
}

export interface DistanceResult {
  distance: number;
  duration?: number;
  profile?: string;
  from?: { latitude?: number; longitude?: number; address?: string };
  to?: { latitude?: number; longitude?: number; address?: string };
  timestamp?: number;
  mapUrl?: string;
}

export interface PlaceResult {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  timestamp?: number;
  mapUrl?: string;
}

export interface NearbyPlacesResult {
    places: PlaceResult[];
}

// Main hook using the new Smithery client via adapted tools
export const useMapboxMCP = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [mcpTools, setMcpTools] = useState<Record<string, AISdkToolDefinition<any, any>> | null>(null);

  const [geocodeData, setGeocodeData] = useState<LocationResult | null>(null);
  const [distanceData, setDistanceData] = useState<DistanceResult | null>(null);
  const [nearbyPlacesData, setNearbyPlacesData] = useState<NearbyPlacesResult | null>(null);
  const [processQueryStreamParts, setProcessQueryStreamParts] = useState<any[]>([]);
  const [currentTextStream, setCurrentTextStream] = useState<string>("");

  // Fetch adapted Smithery tools on mount
  useEffect(() => {
    getAdaptedSmitheryTools()
      .then(tools => {
        setMcpTools(tools);
        if (Object.keys(tools).length === 0) {
          console.warn("No MCP tools loaded, geospatial functions may be limited.");
          // setError(new Error("Failed to load geospatial tools.")); // Optional: set an error
        } else {
          console.log("MCP tools loaded:", Object.keys(tools));
        }
      })
      .catch(err => {
        console.error("Error loading MCP tools:", err);
        setError(err);
      });
  }, []);

  // Effect to clear errors after a delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const geocodeLocation = useCallback(async (address: string): Promise<LocationResult | null> => {
    setIsLoading(true);
    setError(null);
    setGeocodeData(null);
    try {
      const { text, finishReason } = await generateText({
        model: smitheryModel,
        prompt: `Geocode: ${address}`,
        // tools: { // Smithery provider currently infers tool from prompt, so this is for documentation primarily
        //   geocode_location: {
        //     description: 'Geocodes an address to latitude and longitude.',
        //     parameters: z.object({ address: z.string() }),
        //   },
        // },
      });

      if (finishReason === 'stop' && text) {
        // Assuming Smithery returns { latitude: number, longitude: number, place_name?: string, address?: string, mapUrl?: string }
        const result = JSON.parse(text) as Omit<LocationResult, 'query' | 'timestamp'>;
        const fullResult = { ...result, query: address, timestamp: Date.now() };
        setGeocodeData(fullResult);
        return fullResult;
      } else {
        throw new Error(`Geocoding failed. Unexpected finish reason: ${finishReason}. Response: ${text}`);
      }
    } catch (e: any) {
      console.error('Geocoding Error:', e);
      setError(e);
      setGeocodeData(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateDistance = useCallback(
    async (
      start_longitude: number, start_latitude: number, // Note: lon, lat order for Smithery
      end_longitude: number, end_latitude: number,
      // profile: 'driving' | 'walking' | 'cycling' = 'driving' // Smithery provider might not support profile yet
    ): Promise<DistanceResult | null> => {
      setIsLoading(true);
      setError(null);
      setDistanceData(null);
      try {
        const params = {
          // Parameters as expected by SmitheryMCPLanguageModel's parsing
          start_longitude,
          start_latitude,
          end_longitude,
          end_latitude,
          // profile, // Add if Smithery provider supports it
        };
        // Constructing prompt to be parsed by SmitheryMCPLanguageModel
        // "CalculateDistance: { \"start_latitude\": LAT, \"start_longitude\": LON, ... }"
        const prompt = `CalculateDistance: ${JSON.stringify({
            from: [start_longitude, start_latitude], // For Smithery provider parsing logic
            to: [end_longitude, end_latitude] // For Smithery provider parsing logic
        })}`;

        const { text, finishReason } = await generateText({
          model: smitheryModel,
          prompt: prompt,
          // tools: { // For documentation
          //   calculate_distance: {
          //     description: 'Calculates distance between two points.',
          //     parameters: z.object({
          //       start_latitude: z.number(), start_longitude: z.number(),
          //       end_latitude: z.number(), end_longitude: z.number(),
          //       // profile: z.string().optional(),
          //     }),
          //   },
          // },
        });

        if (finishReason === 'stop' && text) {
          // Assuming Smithery returns { distance: number, duration?: number, mapUrl?: string }
          const result = JSON.parse(text) as Omit<DistanceResult, 'timestamp' | 'from' | 'to'>;
          const fullResult = {
            ...result,
            timestamp: Date.now(),
            from: { latitude: start_latitude, longitude: start_longitude },
            to: { latitude: end_latitude, longitude: end_longitude },
          };
          setDistanceData(fullResult);
          return fullResult;
        } else {
          throw new Error(`Distance calculation failed. Unexpected finish reason: ${finishReason}. Response: ${text}`);
        }
      } catch (e: any) {
        console.error('Distance Calculation Error:', e);
        setError(e);
        setDistanceData(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const searchNearbyPlaces = useCallback(
    async (
      query: string,
      longitude: number, // Note: lon, lat order for Smithery
      latitude: number,
      // radius: number = 1000, // Smithery provider might not support these yet
      // limit: number = 5,
    ): Promise<NearbyPlacesResult | null> => {
      setIsLoading(true);
      setError(null);
      setNearbyPlacesData(null);
      try {
        const params = {
          query,
          longitude, // Parameter name as expected by SmitheryMCPLanguageModel
          latitude,  // Parameter name as expected by SmitheryMCPLanguageModel
          // radius, // Add if Smithery provider supports it
          // limit,  // Add if Smithery provider supports it
        };
         // Constructing prompt to be parsed by SmitheryMCPLanguageModel
        const prompt = `SearchNearby: ${JSON.stringify({
            query,
            location: [longitude, latitude] // For Smithery provider parsing logic
        })}`;

        const { text, finishReason } = await generateText({
          model: smitheryModel,
          prompt: prompt,
          // tools: { // For documentation
          //   search_nearby_places: {
          //     description: 'Searches for places nearby a given location.',
          //     parameters: z.object({
          //       query: z.string(),
          //       latitude: z.number(),
          //       longitude: z.number(),
          //       // radius: z.number().optional(),
          //       // limit: z.number().optional(),
          //     }),
          //   },
          // },
        });

        if (finishReason === 'stop' && text) {
          // Assuming Smithery returns { places: [{ name, address?, latitude, longitude, mapUrl? }] }
          // Or an array directly: [{ name, address?, latitude, longitude, mapUrl? }]
          const result = JSON.parse(text);
          let placesArray: PlaceResult[];

          if (Array.isArray(result)) {
            placesArray = result as Omit<PlaceResult, 'timestamp'>[];
          } else if (result.places && Array.isArray(result.places)) {
            placesArray = result.places as Omit<PlaceResult, 'timestamp'>[];
          } else {
            throw new Error ('Nearby search response is not in the expected format (array or {places: array})');
          }

          const fullResult = {
              places: placesArray.map(place => ({ ...place, timestamp: Date.now() }))
          };
          setNearbyPlacesData(fullResult);
          return fullResult;
        } else {
          throw new Error(`Nearby search failed. Unexpected finish reason: ${finishReason}. Response: ${text}`);
        }
      } catch (e: any) {
        console.error('Nearby Search Error:', e);
        setError(e);
        setNearbyPlacesData(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // const processLocationQuery = useCallback(async (query: string) => {
  //   // This function requires doStream for a good user experience,
  //   // or a more complex doGenerate in the provider that can handle general queries.
  //   // Commenting out as per subtask instructions.
  //   console.warn('processLocationQuery is not implemented with the new Smithery provider.');
  //   setIsLoading(true);
  //   setError(null);
  //   // setLocationQueryData(null); // Assuming you have a state for this
  //   setIsLoading(false);
  //   return null;
  // }, []);

  const processLocationQuery = useCallback(
    async (query: string, existingMessages: CoreMessage[] = []) => {
      setIsLoading(true);
      setError(null);
      setProcessQueryStreamParts([]);
      setCurrentTextStream("");

      const systemPrompt = `You are a helpful location assistant. For location-related queries:
1. For address/place queries: Use geocode_location to find coordinates and get map previews.
2. For distance/travel queries: Use calculate_distance to get routes and travel times.
3. For nearby searches: Use search_nearby_places to find points of interest.
You can also respond conversationally. If a tool is called, summarize its results for the user.`;

      const messages: CoreMessage[] = [
        { role: 'system', content: systemPrompt },
        ...existingMessages,
        { role: 'user', content: query },
      ];

      // Define tools for streamText - execute methods are placeholders for now
      // Smithery provider's doStream will determine if these are called or if Smithery executes internally.
      const tools: Record<string, ToolDefinition<any, any>> = {
        geocode_location: {
          description: 'Geocodes an address to latitude and longitude and provides a map view if available.',
          parameters: z.object({
            address: z.string().describe('The address or place name to geocode.'),
            // includeMapPreview: z.boolean().optional().default(true), // Example if Smithery supports this
          }),
          execute: async (args: { address: string }) => {
            console.log(`[Client Tool Execute] geocode_location called with: ${args.address}`);
            // In a real scenario, this might call the standalone `this.geocodeLocation(args.address)`
            // but that would involve a separate `doGenerate` call.
            // For now, this is a placeholder. The provider's `doStream` might get a `tool-result` part
            // from Smithery if Smithery executes it internally.
            // This execute function will only be called if the AI SDK pauses the stream for client execution.
            return { success: true, message: `Client executed geocode_location for ${args.address}. (Placeholder)` };
          },
        },
        calculate_distance: {
          description: 'Calculates the distance and travel time between two locations.',
          parameters: z.object({
            start_longitude: z.number(),
            start_latitude: z.number(),
            end_longitude: z.number(),
            end_latitude: z.number(),
            // profile: z.enum(['driving', 'walking', 'cycling']).optional().default('driving'),
          }),
          execute: async (args: any) => {
            console.log('[Client Tool Execute] calculate_distance called with:', args);
            return { success: true, message: 'Client executed calculate_distance. (Placeholder)', args };
          },
        },
        search_nearby_places: {
          description: 'Searches for places (e.g., restaurants, cafes) near a specified location.',
          parameters: z.object({
            query: z.string().describe('The type of place to search for (e.g., "coffee", "park").'),
            longitude: z.number().describe('The longitude of the search center.'),
            latitude: z.number().describe('The latitude of the search center.'),
            // radius: z.number().optional().default(1000),
            // limit: z.number().optional().default(5),
          }),
          execute: async (args: any) => {
            console.log('[Client Tool Execute] search_nearby_places called with:', args);
            return { success: true, message: 'Client executed search_nearby_places. (Placeholder)', args };
          },
        },
      };
      
      let finalResult: any = null;
      let textContent = "";

      try {
        const streamResponse = await streamText({
          model: smitheryModel,
          messages,
          tools,
          // onFinish: (data) => {
          //   console.log("streamText onFinish:", data);
          //   setProcessQueryStreamParts(prev => [...prev, { type: 'finish', data }]);
          //   finalResult = data; // Capture final data with usage, etc.
          // },
          // onError: (e) => {
          //   console.error("streamText onError:", e);
          //   setError(e);
          //   setProcessQueryStreamParts(prev => [...prev, { type: 'error', error: e }]);
          // }
        });

        for await (const part of streamResponse.fullStream) {
          setProcessQueryStreamParts(prev => [...prev, part]); // Store all parts for potential UI rendering / debugging
          if (part.type === 'text-delta') {
            textContent += part.textDelta;
            setCurrentTextStream(textContent);
          } else if (part.type === 'tool-call') {
            // If Smithery sends tool-call and AI SDK doesn't auto-execute client-side (because no execute fn returns result directly to stream handler)
            // then we might just log it here. The provider is already yielding it.
            // If the AI SDK *does* pause and call our placeholder 'execute' methods above, that's fine too.
            console.log('StreamPart: tool-call received in hook:', part);
          } else if (part.type === 'tool-result') {
            // This implies Smithery executed the tool and sent its result,
            // or the AI SDK called our client-side execute and is now providing its result.
            console.log('StreamPart: tool-result received in hook:', part);
            // You might want to parse part.result and update specific state, e.g., geocodeData
            // For example, if part.toolName === 'geocode_location'
            // const geoResult = JSON.parse(part.result as string) as LocationResult;
            // setGeocodeData(geoResult); // This could trigger map updates etc.
          } else if (part.type === 'finish') {
            console.log('StreamPart: finish received in hook:', part);
            finalResult = part; // Contains finishReason, usage.
          } else if (part.type === 'error') {
             console.error('StreamPart: error received in hook:', part.error);
             setError(new Error(String(part.error)));
          }
        }

        // After stream is complete, finalResult will have usage, finishReason.
        // textContent will have the full text.
        // You might want to update other states based on the collected stream parts or finalResult.
        // For example, updating map location if coordinates were found in textContent or toolResults.

      } catch (e: any) {
        console.error('Processing location query stream error:', e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
      // Return value might be the accumulated text, tool calls/results, or a summary object
      return {
        fullText: textContent,
        streamParts: processQueryStreamParts, // for debugging or advanced UI
        finalStreamData: finalResult,
      };
    },
    [], // No dependencies, smitheryModel is stable
  );


  return {
    isLoading,
    error,
    geocodeData,
    distanceData,
    nearbyPlacesData,
    processQueryStreamParts, // Expose stream parts for UI if needed
    currentTextStream, // Expose current accumulated text stream
    // locationQueryData, // Related state for processLocationQuery - consider replacing with stream parts/text
    geocodeLocation,
    calculateDistance,
    searchNearbyPlaces,
    processLocationQuery, // Re-enabled
    // connect, disconnect, isConnected, isConnecting, connectionError, // Removed old connection logic
  };
};
