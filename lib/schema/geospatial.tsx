import { z } from 'zod';

// Flat schema. JSON Schema output is a single object with optional fields,
// so OpenAI-compatible endpoints (xAI) accept it. Field requirements per
// queryType are conveyed to the LLM via the queryType description; runtime
// behavior in the tool's execute() already tolerates missing fields per
// queryType, so loosening the schema introduces no new failure modes.

export const geospatialQuerySchema = z.object({
  queryType: z.enum(['search', 'geocode', 'reverse', 'directions', 'distance', 'map'])
    .describe(
      "Type of geospatial query. Set the corresponding fields: " +
      "'search' → query (optionally coordinates, radius, maxResults); " +
      "'geocode' → location (optionally maxResults); " +
      "'reverse' → coordinates (optionally maxResults); " +
      "'directions' → origin + destination (optionally mode); " +
      "'distance' → origin + destination (optionally mode); " +
      "'map' → location."
    ),
  query: z.string()
    .min(1)
    .optional()
    .describe("Search term for places/POIs (used by 'search')"),
  location: z.string()
    .min(1)
    .optional()
    .describe("Location to geocode or render as a map (used by 'geocode' and 'map')"),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
    .optional()
    .describe("Coordinates (required for 'reverse', optional proximity hint for 'search')"),
  origin: z.string()
    .min(1)
    .optional()
    .describe("Starting location (used by 'directions' and 'distance')"),
  destination: z.string()
    .min(1)
    .optional()
    .describe("Ending location (used by 'directions' and 'distance')"),
  mode: z.enum(['driving', 'walking', 'cycling', 'transit'])
    .optional()
    .default('driving')
    .describe("Transportation mode (used by 'directions' and 'distance')"),
  radius: z.number()
    .positive()
    .optional()
    .describe("Search radius in kilometers (used by 'search')"),
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
});

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