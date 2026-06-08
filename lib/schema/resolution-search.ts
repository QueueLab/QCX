import { z } from 'zod'

// This schema is designed to be compatible with xAI's OpenAI-compatible endpoint.
// We use a flattened structure and avoid z.literal (which generates JSON Schema 'const')
// and z.any() to ensure maximum compatibility with xAI's schema validation.
// This follows the pattern established in lib/schema/geospatial.tsx.

export const resolutionSearchSchema = z.object({
  summary: z.string().describe('A detailed text summary of the analysis, including land feature classification, points of interest, relevant current news, and temporal context.'),

  // geoJson is optional so the model is not forced to produce features when none are found.
  geoJson: z.object({
    type: z.string().describe("Must be 'FeatureCollection'"),
    features: z.array(z.object({
      type: z.string().describe("Must be 'Feature'"),
      geometryType: z.string().describe("The type of geometry, e.g., 'Point', 'Polygon'"),
      coordinates: z.array(z.number())
        .or(z.array(z.array(z.number())))
        .or(z.array(z.array(z.array(z.number()))))
        .describe('Coordinates for the geometry'),
      name: z.string().describe('Name of the feature or point of interest'),
      description: z.string().optional().describe('Description of the feature')
    }))
  }).optional().describe('A collection of points of interest and classified land features to be overlaid on the map.'),

  // Flattened top-level fields for better xAI compatibility
  extractedLatitude: z.number().optional().describe('The extracted latitude of the center of the image.'),
  extractedLongitude: z.number().optional().describe('The extracted longitude of the center of the image.'),

  cogApplicable: z.boolean().optional().describe('Whether Cloud Optimized GeoTIFF (COG) data is applicable for this area.'),
  cogDescription: z.string().optional().describe('Description of COG data availability or benefits.'),

  hasRecentNews: z.boolean().optional().describe('Whether there is recent news relevant to the location.'),
  newsItems: z.array(z.object({
    title: z.string(),
    summary: z.string(),
    relevance: z.string()
  })).optional().describe('List of recent news items relevant to the location.'),

  // New fields for contextual labels
  mapboxImageLabel: z.string().optional().describe('A contextual label describing what the Mapbox image shows, based on the analysis focus.'),
  googleImageLabel: z.string().optional().describe('A contextual label describing what the Google Satellite image shows, based on the analysis focus.'),
  analysisFocus: z.string().optional().describe('A brief phrase describing the primary focus of the analysis (e.g., "Urban infrastructure analysis", "Forest coverage assessment").')
})

export type ResolutionSearch = z.infer<typeof resolutionSearchSchema>;
