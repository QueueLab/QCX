import { z } from 'zod';

// ADD RENDER OPTIONS TO SCHEMA
export const renderSchema = z.object({
  style: z.enum(['streets-v12', 'satellite-v9', 'light-v11', 'dark-v11', 'outdoors-v12', 'satellite-streets-v12']).optional().describe("Map style to apply"),
  zoom: z.number().min(0).max(22).optional().describe("Zoom level"),
  pitch: z.number().min(0).max(85).optional().describe("Map pitch in degrees"),
  bearing: z.number().optional().describe("Map bearing in degrees"),
  layers: z.array(z.object({
    id: z.string().describe("Unique layer ID"),
    type: z.enum(['fill', 'line', 'symbol', 'circle', 'heatmap', 'fill-extrusion', 'raster', 'hillshade', 'background']).describe("Layer type"),
    source: z.any().describe("Layer source data (URL or GeoJSON)"),
    paint: z.record(z.any()).optional().describe("Layer paint properties"),
    layout: z.record(z.any()).optional().describe("Layer layout properties")
  })).optional().describe("Layers to add to the map")
}).optional().describe("Map rendering instructions");

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
    render: renderSchema,
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
    render: renderSchema,
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
    render: renderSchema,
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
    render: renderSchema,
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
    render: renderSchema,
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
    render: renderSchema,
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