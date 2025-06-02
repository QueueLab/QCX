import { getModel } from 'QCX/lib/utils';
import { getAdaptedSmitheryTools } from '@/lib/smithery-tools-for-ai-sdk';
import { streamText, CoreMessage, ToolCallPart, ToolResultPart } from 'ai';
import { z } from 'zod';

export const geospatialToolInputSchema = z.object({
  query: z.string().describe("The natural language query that may contain location information, e.g., 'restaurants near the Eiffel Tower' or 'distance from London to Paris'"),
});

interface MapData {
  type: 'Point' | 'Route' | 'Places' | 'Unknown'; // Add more types as needed
  coordinates?: [number, number]; // [lon, lat] for Point
  label?: string;
  geojson?: any; // For routes or complex shapes
  places?: Array<{ name: string; coordinates: [number, number]; address?: string }>; // For search_nearby_places
  // Add other relevant fields based on what Smithery tools might return
}

interface GeospatialToolOutput {
  textResponse: string;
  mapData: MapData | null;
  smitheryToolInvocations: Array<ToolCallPart | ToolResultPart>; // Store the raw tool interactions
  error: string | null;
}

export const geospatialTool = {
  description: "Processes geospatial queries using the primary LLM and specialized Smithery mapping tools. It can find locations, calculate distances, get directions, or understand spatial relationships. Returns a textual answer and structured map data.",
  parameters: geospatialToolInputSchema,
  execute: async ({ query }: z.infer<typeof geospatialToolInputSchema>): Promise<GeospatialToolOutput> => {
    let adaptedSmitheryTools;
    try {
      adaptedSmitheryTools = await getAdaptedSmitheryTools();
      if (!adaptedSmitheryTools || Object.keys(adaptedSmitheryTools).length === 0) {
        console.warn('Geospatial tool: No Smithery tools available.');
        // Depending on desired behavior, could return an error or try to respond without tools
        // For now, let LLM try to answer without specific geospatial tools if none are loaded.
      }
    } catch (e: any) {
      console.error('Geospatial tool: Failed to load Smithery tools:', e);
      return {
        textResponse: "I'm having trouble accessing my geospatial capabilities right now.",
        mapData: null,
        smitheryToolInvocations: [],
        error: `Failed to load geospatial tools: ${e.message}`,
      };
    }

    const messages: CoreMessage[] = [
      {
        role: 'system',
        content: `You are a helpful assistant with access to geospatial tools. When a user asks a question that involves a location, distance, or spatial understanding, use the available Smithery mapping tools (geocode_location, calculate_distance, search_nearby_places) to find the information and incorporate it into your answer. Prioritize using these tools for relevant queries. When a tool provides structured data like coordinates or place names, mention them in your textual response too.`
      },
      { role: 'user', content: query }
    ];

    let accumulatedText = "";
    const smitheryToolInvocations: Array<ToolCallPart | ToolResultPart> = [];
    let extractedMapData: MapData | null = null;
    let executeError: string | null = null;

    try {
      const streamResult = await streamText({
        model: getModel(),
        tools: adaptedSmitheryTools, // Pass even if empty, let LLM decide
        messages: messages,
      });

      for await (const part of streamResult.fullStream) {
        if (part.type === 'text-delta') {
          accumulatedText += part.textDelta;
        } else if (part.type === 'tool-call') {
          // Log or store tool calls if needed, especially to see LLM's intent
          smitheryToolInvocations.push(part);
          console.log(`Geospatial tool observed tool call: ${part.toolName}`, part.args);
        } else if (part.type === 'tool-result') {
          smitheryToolInvocations.push(part);
          console.log(`Geospatial tool observed tool result for ${part.toolName}:`, part.result);

          // --- Extract MapData from Smithery tool results ---
          // This section requires knowing the structure of results from smitheryClient.call()
          // as processed by the adapted tools.
          try {
            const toolResultData = typeof part.result === 'string' ? JSON.parse(part.result) : part.result;

            if (part.toolName === 'geocode_location' && toolResultData) {
              // Assuming result might be { location: { latitude, longitude, place_name, address }, mapUrl }
              // or directly { latitude, longitude, ... }
              const lat = toolResultData.location?.latitude ?? toolResultData.latitude;
              const lon = toolResultData.location?.longitude ?? toolResultData.longitude;
              const placeName = toolResultData.location?.place_name ?? toolResultData.place_name ?? toolResultData.address ?? query; // Fallback to query
              if (lat && lon) {
                extractedMapData = {
                  type: 'Point',
                  coordinates: [lon, lat],
                  label: placeName,
                  // mapUrl: toolResultData.mapUrl // If mapUrl is part of the result
                };
              }
            } else if (part.toolName === 'calculate_distance' && toolResultData) {
              // Assuming result might be { distance, duration, from: {address, lat, lon}, to: {address, lat, lon}, mapUrl, geojson }
              if (toolResultData.geojson) { // If Smithery provides a route GeoJSON
                extractedMapData = {
                  type: 'Route',
                  geojson: toolResultData.geojson,
                  label: `Route from ${toolResultData.from?.address || 'start'} to ${toolResultData.to?.address || 'end'}`,
                };
              } else if (toolResultData.to?.latitude && toolResultData.to?.longitude) { // Fallback to destination point
                 extractedMapData = {
                    type: 'Point',
                    coordinates: [toolResultData.to.longitude, toolResultData.to.latitude],
                    label: `Destination: ${toolResultData.to.address || 'endpoint'}`
                 }
              }
            } else if (part.toolName === 'search_nearby_places' && toolResultData) {
              // Assuming result is { places: [{ name, latitude, longitude, address }] }
              if (Array.isArray(toolResultData.places) && toolResultData.places.length > 0) {
                extractedMapData = {
                  type: 'Places',
                  places: toolResultData.places.map((p: any) => ({
                    name: p.name,
                    coordinates: [p.longitude, p.latitude],
                    address: p.address,
                  })),
                  label: `Nearby places for "${toolResultData.query || query}"`
                };
                 // If there's a central search location from the result, could add it too.
                 // For example, if the input 'location' to the tool was geocoded and returned.
              }
            }
          } catch(parseError: any) {
            console.warn(`Geospatial tool: Error parsing tool result for ${part.toolName}: ${parseError.message}`, part.result);
          }
        } else if (part.type === 'error') {
            console.error('Geospatial tool: Error part in stream:', part.error);
            executeError = String(part.error);
        }
      }
    } catch (e: any) {
      console.error('Geospatial tool: Failed during streamText execution:', e);
      executeError = `Error processing geospatial query: ${e.message}`;
      if (!accumulatedText) { // If error happened before any text, provide a default error response
        accumulatedText = "I encountered an error trying to process your geospatial query.";
      }
    }

    // Fallback: if no map data from tools, try to infer from text if it's a simple place name for future enhancement.
    // For now, rely on explicit tool output.

    return {
      textResponse: accumulatedText,
      mapData: extractedMapData,
      smitheryToolInvocations,
      error: executeError,
    };
  }
};
