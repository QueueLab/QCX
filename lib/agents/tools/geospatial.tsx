/**
 * Geospatial tool backed directly by the Mapbox REST APIs (Search Box, Geocoding v6, Directions).
 */
import { createStreamableUI, createStreamableValue } from 'ai/rsc';
import { BotMessage } from '@/components/message';
import { geospatialQuerySchema } from '@/lib/schema/geospatial';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSelectedModel } from '@/lib/actions/users';
import { MapProvider } from '@/lib/store/settings';
import {
  MapboxPlace,
  MapboxRoute,
  getMapboxToken,
  getRoute,
  getStaticMapUrl,
  reverseGeocode,
  searchPlaces
} from './mapbox';

interface Location {
  latitude?: number;
  longitude?: number;
  place_name?: string;
  address?: string;
}

interface McpResponse {
  location: Location;
  mapUrl?: string;
  results?: Location[];
  route?: MapboxRoute & { origin?: string; destination?: string };
}

/**
 * Helper to generate a Google Static Map URL
 */
function getGoogleStaticMapUrl(latitude: number, longitude: number): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return '';
  return `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=640x480&scale=2&markers=color:red%7C${latitude},${longitude}&key=${apiKey}`;
}

const toLocation = (place: MapboxPlace): Location => ({
  latitude: place.latitude,
  longitude: place.longitude,
  place_name: place.name || place.address,
  address: place.address
});

async function resolvePlace(text: string): Promise<MapboxPlace> {
  const [place] = await searchPlaces(text, { limit: 1 });
  if (!place || typeof place.latitude !== 'number' || typeof place.longitude !== 'number') {
    throw new Error(`Could not find a location matching "${text}".`);
  }
  return place;
}

export async function runMapboxQuery(params: z.infer<typeof geospatialQuerySchema>): Promise<McpResponse> {
  const { queryType } = params;
  const maxResults = params.maxResults || 5;
  const proximity = params.coordinates;

  switch (queryType) {
    case 'directions':
    case 'distance': {
      if (!params.origin || !params.destination) {
        throw new Error(`'${queryType}' query requires origin and destination`);
      }
      const [origin, destination] = await Promise.all([
        resolvePlace(params.origin),
        resolvePlace(params.destination)
      ]);
      const route = await getRoute(origin, destination, params.mode);
      return {
        location: toLocation(destination),
        results: [toLocation(origin), toLocation(destination)],
        route: { ...route, origin: origin.address || origin.name, destination: destination.address || destination.name },
        mapUrl: params.includeMap === false ? undefined : getStaticMapUrl([origin, destination])
      };
    }
    case 'reverse': {
      if (!params.coordinates) throw new Error("'reverse' query requires coordinates");
      const { latitude, longitude } = params.coordinates;
      const [place] = await reverseGeocode(latitude, longitude, 1);
      const location = place
        ? { ...toLocation(place), latitude, longitude }
        : { latitude, longitude };
      return {
        location,
        mapUrl: params.includeMap === false ? undefined : getStaticMapUrl([{ latitude, longitude }])
      };
    }
    case 'search': {
      const text = params.query || params.location;
      if (!text) throw new Error("'search' query requires query");
      const places = await searchPlaces(text, { limit: maxResults, proximity });
      if (places.length === 0) throw new Error(`No places found for "${text}".`);
      return {
        location: toLocation(places[0]),
        results: places.map(toLocation),
        mapUrl: params.includeMap === false ? undefined : getStaticMapUrl(places)
      };
    }
    case 'geocode':
    case 'map':
    default: {
      const text = params.location || params.query;
      if (!text) throw new Error(`'${queryType}' query requires location`);
      // Search Box covers landmarks/POIs as well as addresses and places; it falls back to Geocoding v6.
      const places = await searchPlaces(text, { limit: queryType === 'map' ? 1 : maxResults, proximity });
      if (places.length === 0) throw new Error(`Could not find a location matching "${text}".`);
      return {
        location: toLocation(places[0]),
        results: places.map(toLocation),
        mapUrl: params.includeMap === false ? undefined : getStaticMapUrl([places[0]])
      };
    }
  }
}

/**
 * Main geospatial tool executor.
 */
export const geospatialTool = ({
  uiStream,
  mapProvider
}: {
  uiStream: ReturnType<typeof createStreamableUI>
  mapProvider?: MapProvider
}) => ({
  description: `Location tool backed by Mapbox. Use it for any query about places, addresses, landmarks, businesses/POIs, "near me" searches, coordinates, distances, routes or directions.
- 'search': find POIs/businesses (set query; optional coordinates as proximity, maxResults)
- 'geocode' / 'map': resolve a place name or address to coordinates and show it on the map (set location)
- 'reverse': convert coordinates to an address (set coordinates)
- 'directions' / 'distance': route distance and travel time between two places (set origin, destination, optional mode)
Returns the best match (name, address, latitude, longitude), additional matches, and route details when applicable.`,
  parameters: geospatialQuerySchema,
  execute: async (params: z.infer<typeof geospatialQuerySchema>) => {
    const { queryType } = params;
    console.log('[GeospatialTool] Execute called with:', params, 'and map provider:', mapProvider);

    const uiFeedbackStream = createStreamableValue<string>();
    uiStream.append(<BotMessage content={uiFeedbackStream.value} />);

    const selectedModel = await getSelectedModel();

    if (selectedModel?.toLowerCase().includes('gemini') && mapProvider === 'google') {
      let feedbackMessage = `Processing geospatial query with Gemini 3.1 Pro...`;
      uiFeedbackStream.update(feedbackMessage);

      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_3_PRO_API_KEY!);
        const model = genAI.getGenerativeModel({
          model: 'gemini-3.1-pro-preview',
        });

        const searchText = (params as any).location || (params as any).query;
        const prompt = `Find the location for: ${searchText}`;
        const tools: any = [{ googleSearch: {} }];
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools,
        });
        const response = await result.response;
        const functionCalls = (response as any).functionCalls();

        if (functionCalls && functionCalls.length > 0) {
          const gsr = functionCalls[0];
          // This is a placeholder for the actual response structure,
          // as I don't have a way to inspect it at the moment.
          const place = (gsr as any).results[0].place;
          if (place) {
            const { latitude, longitude } = place.coordinates;
            const place_name = place.displayName;

            const mcpData: McpResponse = {
              location: {
                latitude,
                longitude,
                place_name,
              },
            };

            if (mapProvider === 'google') {
              mcpData.mapUrl = getGoogleStaticMapUrl(latitude, longitude);
            }

            feedbackMessage = `Found location: ${place_name}`;
            uiFeedbackStream.update(feedbackMessage);
            uiFeedbackStream.done();
            return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: mcpData, error: null };
          }
        }
        throw new Error('No location found by Gemini.');
      } catch (error: any) {
        const toolError = `Gemini grounding error: ${error.message}`;
        uiFeedbackStream.update(toolError);
        console.error('[GeospatialTool] Gemini execution failed:', error);
        uiFeedbackStream.done();
        return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: null, error: toolError };
      }
    }

    uiFeedbackStream.update(`Processing ${queryType} location query...`);

    if (!getMapboxToken()) {
      const toolError = 'Geospatial functionality is unavailable: MAPBOX_ACCESS_TOKEN is not configured.';
      uiFeedbackStream.done(toolError);
      return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: null, error: toolError };
    }

    let mcpData: McpResponse | null = null;
    let toolError: string | null = null;

    try {
      mcpData = await runMapboxQuery(params);

      if (mapProvider === 'google' && mcpData.location.latitude && mcpData.location.longitude) {
        mcpData.mapUrl = getGoogleStaticMapUrl(mcpData.location.latitude, mcpData.location.longitude) || mcpData.mapUrl;
      }

      uiFeedbackStream.done(`Found: ${mcpData.location.place_name || mcpData.location.address || queryType}`);
    } catch (error: any) {
      toolError = `Mapping service error: ${error.message}`;
      console.error('[GeospatialTool] Tool execution failed:', error);
      uiFeedbackStream.done(toolError);
    }

    return { type: 'MAP_QUERY_TRIGGER', originalUserInput: JSON.stringify(params), queryType, timestamp: new Date().toISOString(), mcp_response: mcpData, error: toolError };
  },
});
