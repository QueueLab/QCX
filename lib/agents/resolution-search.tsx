import { CoreMessage } from 'ai'
import { z } from 'zod'
import { routerAgent } from './router-agent' // Import the new router agent
import { SatelliteIntelligence } from '../services/mock-satellite-services' // Import the type

// The schema for the final output remains the same, as this is what the UI expects.
const resolutionSearchSchema = z.object({
  summary: z.string().describe('A detailed text summary of the analysis, including land feature classification, points of interest, and relevant current news.'),
  geoJson: z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(z.object({
      type: z.literal('Feature'),
      geometry: z.object({
        type: z.string(),
        coordinates: z.any(),
      }),
      properties: z.object({
        name: z.string(),
        description: z.string().optional(),
      }),
    })),
  }).describe('A GeoJSON object containing points of interest and classified land features to be overlaid on the map.'),
})

export async function resolutionSearch(messages: CoreMessage[]) {
  // Delegate the core analysis to the router agent.
  const analysisResult = await routerAgent(messages) as SatelliteIntelligence

  // Adapt the result from the sub-agent to the format expected by the UI.
  const summary = `Analysis: ${analysisResult.analysis}\nConfidence: ${analysisResult.confidenceScore}\nDetected Objects: ${analysisResult.detectedObjects.join(', ')}`

  // Create a mock GeoJSON object since the mock tool doesn't provide one.
  // In a real implementation, this would be generated based on the analysis result.
  const geoJson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0], // Placeholder coordinates
        },
        properties: {
          name: 'Analysis Center',
          description: 'This is a placeholder based on mock analysis.',
        },
      },
    ],
  }

  // Construct the final object that conforms to the expected schema.
  const finalObject = {
    summary,
    geoJson,
  }

  // an object that includes the raw analysis result for the UI to use.
  return {
    ...resolutionSearchSchema.parse(finalObject),
    satelliteIntelligence: analysisResult,
  }
}