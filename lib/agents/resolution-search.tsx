'use server'

import { CoreMessage, streamObject } from 'ai'
import { getModel } from '@/lib/utils/ai-model'
import { z } from 'zod'
import { type DrawnFeature } from '@/lib/types/geospatial'

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
As a geospatial analyst, your task is to analyze the provided satellite image of a geographic location.
The current local time at this location is ${localTime}.

${drawnFeatures && drawnFeatures.length > 0 ? `The user has drawn the following features on the map for your reference:
${drawnFeatures.map(f => `- ${f.type} (${f.measurement}): ${JSON.stringify(f.geometry)}`).join('\n')}
Use these user-drawn areas/lines as primary areas of interest for your analysis.` : ''}

Your analysis should be comprehensive and include the following components:

1.  **Land Feature Classification:** Identify and describe the different types of land cover visible in the image (e.g., urban areas, forests, water bodies, agricultural fields).
2.  **Points of Interest (POI):** Detect and name any significant landmarks, infrastructure (e.g., bridges, major roads), or notable buildings.
3.  **Structured Output:** Return your findings in a structured JSON format. The output must include a 'summary' (a detailed text description of your analysis) and a 'geoJson' object. The GeoJSON should contain features (Points or Polygons) for the identified POIs and land classifications, with appropriate properties.

Your analysis should be based solely on the visual information in the image and your general knowledge. Do not attempt to access external websites or perform web searches.

Analyze the user's prompt and the image to provide a holistic understanding of the location.
`;

  const filteredMessages = messages.filter(msg => msg.role !== 'system');

  // Check if any message contains an image
  const hasImage = messages.some(message => 
    Array.isArray(message.content) && 
    message.content.some(part => part.type === 'image')
  )

  const model = await getModel(hasImage);

  return streamObject({
    model,
    system: systemPrompt,
    messages: filteredMessages,
    schema: resolutionSearchSchema,
  })
}
