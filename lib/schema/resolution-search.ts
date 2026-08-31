import { z } from 'zod'

// OpenAI Structured Outputs does not reliably support unions of differently
// nested arrays. Keep the model-facing contract flat and validate coordinates
// before they reach GeoJSON consumers.

export const resolutionSearchSchema = z.object({
  summary: z.string().describe('A detailed text summary of the analysis, including land feature classification, points of interest, relevant current news, and temporal context.'),

  // geoJson is optional so the model is not forced to produce features when none are found.
  geoJson: z.object({
    type: z.string().describe("Must be 'FeatureCollection'"),
    features: z.array(z.object({
      type: z.string().describe("Must be 'Feature'"),
      geometryType: z.string().describe("Use 'Point' for structured-output compatibility."),
      coordinates: z.array(z.number()).describe('A longitude/latitude pair for a Point feature, e.g. [13.4, 52.5]. Do not nest this array.'),
      name: z.string().describe('Name of the feature or point of interest'),
      description: z.string().optional().describe('Description of the feature')
    }))
  }).optional().describe('A collection of point features to overlay on the map. Describe polygonal or line features in the summary instead.'),

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
  })).optional().describe('List of recent news items relevant to the location.')
})

export type ResolutionSearch = z.infer<typeof resolutionSearchSchema>
