import { createStreamableUI, createStreamableValue, StreamableValue } from 'ai/rsc'
import { CoreMessage, generateObject } from 'ai'
import { getModel } from '@/lib/utils'
import { z } from 'zod'
import { BotMessage } from '@/components/message'
import { Card } from '@/components/ui/card'

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

export async function resolutionSearch(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: CoreMessage[]
) {
  uiStream.update(<Card>Analyzing map view...</Card>)

  const systemPrompt = `
As a geospatial analyst, your task is to analyze the provided satellite image of a geographic location.
Your analysis should be comprehensive and include the following components:

1.  **Land Feature Classification:** Identify and describe the different types of land cover visible in the image (e.g., urban areas, forests, water bodies, agricultural fields).
2.  **Points of Interest (POI):** Detect and name any significant landmarks, infrastructure (e.g., bridges, major roads), or notable buildings.
3.  **Contextual News & Events:** Based on the identified location, perform a web search to find any relevant and current news or events. For example, if you identify Central Park, search for "current events Central Park NYC".
4.  **Structured Output:** Return your findings in a structured JSON format. The output must include a 'summary' (a detailed text description of your analysis) and a 'geoJson' object. The GeoJSON should contain features (Points or Polygons) for the identified POIs and land classifications, with appropriate properties.

Analyze the user's prompt and the image to provide a holistic understanding of the location.
`;

  const filteredMessages = messages.filter(msg => msg.role !== 'system');

  // Use generateObject to get the full object at once.
  const { object } = await generateObject({
    model: getModel(),
    system: systemPrompt,
    messages: filteredMessages,
    schema: resolutionSearchSchema,
  })

  // Create a streamable value for the summary and immediately mark it as done.
  const summaryStream = createStreamableValue<string>()
  summaryStream.done(object.summary || 'Analysis complete.')

  // Update the UI with the final summary.
  uiStream.done(
    <BotMessage content={summaryStream.value} />
  );

  // Return the complete, validated object.
  return object
}