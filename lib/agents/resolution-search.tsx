import { CoreMessage, streamObject } from 'ai'
import { getModel } from '@/lib/utils'
import { z } from 'zod'

// This agent is now a pure data-processing module, with no UI dependencies.

// Define the schema for the structured response from the AI.
const resolutionSearchSchema = z.object({
  summary: z.string().describe('A detailed text summary of the analysis, including land feature classification, points of interest, and relevant current news.'),
  geoJson: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.object({
      type: z.literal('Feature'),
      geometry: z.object({
        type: z.string(), // e.g., 'Point', 'Polygon'
        coordinates: z.any(),
      }),
      properties: z.object({
        name: z.string(),
        description: z.string().optional(),
      }),
    })),
  }).describe('A GeoJSON object containing points of interest and classified land features to be overlaid on the map.'),
  extractedCoordinates: z.object({
    latitude: z.number(),
    longitude: z.number()
  }).optional().describe('The extracted geocoordinates of the center of the image.'),
  cogInfo: z.object({
    applicable: z.boolean(),
    description: z.string().optional()
  }).optional().describe('Information about whether Cloud Optimized GeoTIFF (COG) data is applicable or available for this area.')
})

export interface DrawnFeature {
  id: string;
  type: 'Polygon' | 'LineString';
  measurement: string;
  geometry: any;
}

export async function resolutionSearch(messages: CoreMessage[], timezone: string = 'UTC', drawnFeatures?: DrawnFeature[], location?: { lat: number, lng: number }) {
  const localTime = new Date().toLocaleString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const systemPrompt = `
As a geospatial analyst, your task is to analyze the provided satellite image of a geographic location.
The current local time at this location is ${localTime}.

${location ? `The coordinates provided for this image are: Latitude ${location.lat}, Longitude ${location.lng}.` : ''}

${drawnFeatures && drawnFeatures.length > 0 ? `The user has drawn the following features on the map for your reference:
${drawnFeatures.map(f => `- ${f.type} (${f.measurement}): ${JSON.stringify(f.geometry)}`).join('\n')}
Use these user-drawn areas/lines as primary areas of interest for your analysis.` : ''}

Your analysis should be comprehensive and include the following components:

1.  **Land Feature Classification:** Identify and describe the different types of land cover visible in the image (e.g., urban areas, forests, water bodies, agricultural fields).
2.  **Points of Interest (POI):** Detect and name any significant landmarks, infrastructure (e.g., bridges, major roads), or notable buildings.
3.  **Coordinate Extraction:** If possible, confirm or refine the geocoordinates (latitude/longitude) of the center of the image.
4.  **COG Applicability:** Determine if this location would benefit from Cloud Optimized GeoTIFF (COG) analysis for high-precision temporal or spectral data.
5.  **Structured Output:** Return your findings in a structured JSON format. The output must include a 'summary' (a detailed text description of your analysis) and a 'geoJson' object.

Your analysis should be based solely on the visual information in the image and your general knowledge. Do not attempt to access external websites or perform web searches.

Analyze the user's prompt and the image to provide a holistic understanding of the location.
`;

  const filteredMessages = messages.filter(msg => msg.role !== 'system');

  // Check if any message contains an image (resolution search is specifically for image analysis)
  const hasImage = messages.some((message: any) => 
    Array.isArray(message.content) && 
    message.content.some((part: any) => part.type === 'image')
  )

  // Use streamObject to get the partial object stream.
  return streamObject({
    model: await getModel(hasImage),
    system: systemPrompt,
    messages: filteredMessages,
    schema: resolutionSearchSchema,
  })
}
