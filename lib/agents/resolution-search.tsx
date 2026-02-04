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
})

export interface DrawnFeature {
  id: string;
  type: 'Polygon' | 'LineString';
  measurement: string;
  geometry: any;
}

export async function resolutionSearch(messages: CoreMessage[], timezone: string = 'UTC', drawnFeatures?: DrawnFeature[]) {
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
As an expert geospatial analyst, your task is to provide a comprehensive analysis of the provided satellite image.
The current local time at the location in the image is ${localTime}.

${drawnFeatures && drawnFeatures.length > 0 ? `CRITICAL CONTEXT: The user has explicitly marked the following areas or features on the map:
${drawnFeatures.map(f => `- ${f.type} with measurement ${f.measurement}`).join('\n')}
You MUST prioritize these user-drawn features as the primary subjects of your analysis. Explain what is visible within these specific boundaries or along these lines.` : ''}

Your analysis should include:

1.  **Contextual Analysis:** Based on visual cues and the user's marked areas, identify the specific location and its significance.
2.  **Land Feature Classification:** Detailed description of land cover (urban, vegetation, water, etc.) within and around the user-drawn features.
3.  **Points of Interest (POI):** Identify infrastructure, buildings, or landmarks, especially those within the user's focus areas.
4.  **Structured Output:** Your response must be in structured JSON format.
    - 'summary': A holistic description of your findings. Mention the user's drawings explicitly in the summary.
    - 'geoJson': Provide accurate GeoJSON (Points or Polygons) for POIs and features you identify, so they can be overlaid back on the map.

Base your analysis solely on visual information and your internal knowledge base. Do not mention that you are an AI or that you cannot perform web searches. Provide a direct, professional report.
`;

  const filteredMessages = messages.filter(msg => msg.role !== 'system');

  // Check if any message contains an image (resolution search is specifically for image analysis)
  const hasImage = messages.some(message => 
    Array.isArray(message.content) && 
    message.content.some(part => part.type === 'image')
  )

  // Use streamObject to get partial results.
  return streamObject({
    model: await getModel(hasImage),
    system: systemPrompt,
    messages: filteredMessages,
    schema: resolutionSearchSchema,
  })
}
