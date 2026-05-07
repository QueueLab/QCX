import { CoreMessage, streamObject } from 'ai'
import { getModel } from '@/lib/utils'
import { z } from 'zod'
import { tavily } from '@tavily/core'

// This agent is now a pure data-processing module, with no UI dependencies.

// Define the schema for the structured response from the AI.
const resolutionSearchSchema = z.object({
  summary: z.string().describe('A detailed text summary of the analysis, including land feature classification, points of interest, relevant current news, and temporal context.'),
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
  }).optional().describe('Information about whether Cloud Optimized GeoTIFF (COG) data is applicable or available for this area.'),
  newsContext: z.object({
    hasRecentNews: z.boolean(),
    newsItems: z.array(z.object({
      title: z.string(),
      summary: z.string(),
      relevance: z.string()
    })).optional()
  }).optional().describe('Recent news and events relevant to the analyzed location.')
})

export interface DrawnFeature {
  id: string;
  type: 'Polygon' | 'LineString';
  measurement: string;
  geometry: any;
}

/**
 * Fetch recent news for a location using Tavily API
 */
async function fetchLocationNews(location: string, timezone: string): Promise<any> {
  try {
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY })
    const query = `recent news events ${location}`
    
    const response = await client.search(query, {
      maxResults: 3,
      searchDepth: 'basic',
      topic: 'news',
      timeRange: 'w', // Past week
      includeAnswer: true,
    })

    return {
      hasRecentNews: response.results && response.results.length > 0,
      newsItems: response.results?.slice(0, 3).map((result: any) => ({
        title: result.title,
        summary: result.content || result.snippet,
        relevance: 'Location-based news'
      })) || []
    }
  } catch (error) {
    console.error('Error fetching location news:', error)
    return {
      hasRecentNews: false,
      newsItems: []
    }
  }
}

/**
 * Get reverse geocoding information to identify the location
 */
async function getReverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'User-Agent': 'QCX-ResolutionSearch' } }
    )
    const data = await response.json()
    return data.address?.city || data.address?.county || data.address?.country || 'Unknown Location'
  } catch (error) {
    console.error('Error in reverse geocoding:', error)
    return 'Unknown Location'
  }
}

export async function resolutionSearch(messages: CoreMessage[], timezone: string = 'UTC', drawnFeatures?: DrawnFeature[], location?: { lat: number, lng: number }) {
  const now = new Date();
  
  // OPTIMIZATION: Format local time with timezone context
  const localTime = now.toLocaleString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // OPTIMIZATION: Get location name for news search
  let locationName = 'this location';
  let newsContext = '';
  
  if (location?.lat && location?.lng) {
    try {
      locationName = await getReverseGeocode(location.lat, location.lng);
      
      // OPTIMIZATION: Fetch news in parallel with AI analysis
      const newsData = await fetchLocationNews(locationName, timezone);
      
      if (newsData.hasRecentNews && newsData.newsItems.length > 0) {
        newsContext = `\n\nRecent News for ${locationName}:\n${newsData.newsItems
          .map((item: any) => `- ${item.title}: ${item.summary}`)
          .join('\n')}`;
      }
    } catch (error) {
      console.error('Error processing location:', error)
    }
  }

  const systemPrompt = `
As a geospatial analyst with advanced reasoning capabilities (Gemini 3.1 Pro), your task is to analyze the provided satellite image of a geographic location.

**Reasoning Approach (Enhanced Chain-of-Thought):**
Before providing your analysis, break down the task into logical steps:
1. Identify visible features and patterns in the satellite image
2. Classify land types based on spectral and spatial characteristics
3. Extract geographic coordinates and validate against provided data
4. Integrate temporal context (time of day, season) with visual observations
5. Cross-reference with recent news and events for the location
6. Synthesize findings into structured output

**Temporal Context:**
The current local time at this location is ${localTime} (timezone: ${timezone}).
This temporal information is important for understanding the current state and any time-sensitive features visible in the image.

${location ? `**Geographic Coordinates:**
The coordinates provided for this image are: Latitude ${location.lat}, Longitude ${location.lng}.
Location: ${locationName}` : ''}

${newsContext ? `**Recent Context:**
${newsContext}

Please incorporate this recent news context into your analysis where relevant.` : ''}

${drawnFeatures && drawnFeatures.length > 0 ? `**User-Drawn Features:**
The user has drawn the following features on the map for your reference:
${drawnFeatures.map(f => `- ${f.type} (${f.measurement}): ${JSON.stringify(f.geometry)}`).join('\n')}
Use these user-drawn areas/lines as primary areas of interest for your analysis.` : ''}

**Multi-Step Analysis Requirements:**

1. **Abstract Pattern Recognition (ARC-AGI-2 Level):** Look for non-obvious patterns and relationships in the satellite imagery that indicate land use changes or unusual features.
2. **Land Feature Classification:** Systematically identify and describe land cover types (urban, forests, water, agriculture, infrastructure).
3. **Points of Interest (POI):** Detect and name significant landmarks, infrastructure (bridges, roads, buildings), and anomalies.
4. **Temporal Analysis:** Explain how the time of day and season affect visibility and interpretation of features.
5. **Coordinate Extraction:** Confirm or refine geocoordinates with reasoning about image center and reference points.
6. **COG Applicability:** Assess whether this location would benefit from Cloud Optimized GeoTIFF analysis.
7. **News Integration:** Explain how recent events correlate with visible landscape features.
8. **Structured Output:** Return findings in structured JSON format with detailed reasoning.

Your analysis should be based on the visual information in the image, the temporal context provided, and your general knowledge. Do not attempt to access external websites or perform web searches beyond what has been provided.

Analyze the user's prompt and the image to provide a holistic understanding of the location with full temporal and contextual awareness.
`;

  const filteredMessages = messages.filter(msg => msg.role !== 'system');

  // Check if any message contains an image (resolution search is specifically for image analysis)
  const hasImage = messages.some((message: any) =>
    Array.isArray(message.content) && 
    message.content.some((part: any) => part.type === 'image')
  )

  // Use streamObject to get partial results.
  return streamObject({
    model: await getModel(hasImage),
    system: systemPrompt,
    messages: filteredMessages,
    schema: resolutionSearchSchema,
  })
}
