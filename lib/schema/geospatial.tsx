import { z } from 'zod';

// Improved schema using discriminatedUnion for better type safety and conditional requirements
// - Enforces required fields based on queryType (e.g., destination for directions/distance)
// - Renames 'query' to 'location' for clarity in most cases, but uses 'origin' and 'destination' for directions/distance
// - Makes 'coordinates' required for 'reverse' and optional for 'search' (as proximity)
// - Adds 'mode' for directions (e.g., driving, walking) assuming tool support can be added
// - Integrates 'radius' and 'maxResults' for 'search', assuming future tool arg expansion
// - Keeps 'includeMap' consistent across all
// - Defaults queryType removed; now required to encourage explicit typing
// - For 'map', treats as general query similar to geocode/search

export const geospatialQuerySchema = z.discriminatedUnion('queryType', [
    z.object({
    queryType: z.literal('search'),
    query: z.string()
      .min(1, "Query cannot be empty")
      .describe("Search term for places/POIs"),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    })
      .optional()
      .describe("Optional reference point for proximity search"),
    radius: z.number()
      .positive()
      .optional()
      .describe("Search radius in kilometers"),
    maxResults: z.number()
      .int()
      .positive()
      .max(20)
      .optional()
      .default(5)
      .describe("Maximum number of results to return"),
    includeMap: z.boolean()
      .optional()
      .default(true)
      .describe("Whether to include a map preview/URL in the response"),
  }),
  z.object({
    queryType: z.literal('geocode'),
    location: z.string()
      .min(1, "Location cannot be empty")
      .describe("The location to geocode - address, place name, or landmark"),
    includeMap: z.boolean()
      .optional()
      .default(true)
      .describe("Whether to include a map preview/URL in the response"),
    maxResults: z.number()
      .int()
      .positive()
      .max(20)
      .optional()
      .default(5)
      .describe("Maximum number of results to return"),
  }),
  z.object({
    queryType: z.literal('reverse'),
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    })
      .describe("Coordinates for reverse geocoding"),
    includeMap: z.boolean()
      .optional()
      .default(true)
      .describe("Whether to include a map preview/URL in the response"),
    maxResults: z.number()
      .int()
      .positive()
      .max(20)
      .optional()
      .default(5)
      .describe("Maximum number of results to return"),
  }),
  z.object({
    queryType: z.literal('directions'),
    origin: z.string()
      .min(1, "Origin cannot be empty")
      .describe("Starting location for directions"),
    destination: z.string()
      .min(1, "Destination cannot be empty")
      .describe("Ending location for directions"),
    mode: z.enum(['driving', 'walking', 'cycling', 'transit'])
      .optional()
      .default('driving')
      .describe("Transportation mode for directions"),
    includeMap: z.boolean()
      .optional()
      .default(true)
      .describe("Whether to include a map preview/URL in the response"),
  }),
  z.object({
    queryType: z.literal('distance'),
    origin: z.string()
      .min(1, "Origin cannot be empty")
      .describe("Starting location for distance calculation"),
    destination: z.string()
      .min(1, "Destination cannot be empty")
      .describe("Ending location for distance calculation"),
    mode: z.enum(['driving', 'walking', 'cycling', 'transit'])
      .optional()
      .default('driving')
      .describe("Transportation mode for distance"),
    includeMap: z.boolean()
      .optional()
      .default(true)
      .describe("Whether to include a map preview/URL in the response"),
  }),
  z.object({
    queryType: z.literal('map'),
    location: z.string()
      .min(1, "Location cannot be empty")
      .describe("Location or area for map request"),
    includeMap: z.boolean()
      .optional()
      .default(true)
      .describe("Whether to include a map preview/URL in the response"),
  })
]);

export type GeospatialQuery = z.infer<typeof geospatialQuerySchema>;

// Updated helper function to classify query type based on content
// Note: This now only classifies type; full parsing (e.g., extracting origin/destination) should be handled by the AI tool caller
export function classifyGeospatialQuery(query: string): GeospatialQuery['queryType'] {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('direction') || lowerQuery.includes('route') || lowerQuery.includes('how to get') || lowerQuery.includes('to ')) {
    return 'directions';
  }
  
  if (lowerQuery.includes('distance') || lowerQuery.includes('how far')) {
    return 'distance';
  }
  
  if (lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('near') || lowerQuery.includes('around')) {
    return 'search';
  }
  
  if (lowerQuery.includes('map') || lowerQuery.includes('show me') || lowerQuery.includes('view of')) {
    return 'map';
  }
  
  // Check if query contains coordinates (lat/lng pattern)
  if (/[-]?\d+\.?\d*\s*,\s*[-]?\d+\.?\d*/.test(query)) {
    return 'reverse';
  }
  
  return 'geocode';
}