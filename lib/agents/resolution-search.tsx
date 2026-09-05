import { CoreMessage, streamObject } from 'ai'
import { getModel } from '@/lib/utils'
import { tavily } from '@tavily/core'
import { resolutionSearchSchema } from '@/lib/schema/resolution-search'
import { GUIDING_PRINCIPLES } from './planetary-prompts'
import { AI_REQUEST_TIMEOUT_MS, ENRICHMENT_TIMEOUT_MS, createDeadlineSignal, withTimeout } from '@/lib/utils/with-timeout'

// This agent is now a pure data-processing module, with no UI dependencies.

export interface DrawnFeature {
  id: string;
  type: 'Polygon' | 'LineString';
  measurement: string;
  geometry: any;
}

function formatDrawingContext(features: DrawnFeature[] = []): string {
  const validFeatures = (Array.isArray(features) ? features : []).filter(feature =>
    feature &&
    (feature.type === 'Polygon' || feature.type === 'LineString') &&
    typeof feature.measurement === 'string' &&
    feature.geometry &&
    Array.isArray(feature.geometry.coordinates)
  )
  return validFeatures.slice(0, 20).map((feature, index) =>
    `Drawing ${index + 1}: ${feature.type}; measured ${feature.measurement}; ` +
    `GeoJSON geometry: ${JSON.stringify(feature.geometry)}`
  ).join('\n')
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
      {
        headers: { 'User-Agent': 'QCX-ResolutionSearch' },
        signal: createDeadlineSignal(ENRICHMENT_TIMEOUT_MS)
      }
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
  let localTime = '';
  try {
    localTime = now.toLocaleString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    console.error(`Invalid timezone specified: ${timezone}, falling back to UTC`, e);
    localTime = now.toLocaleString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // OPTIMIZATION: Get location name for news search
  let locationName = 'this location';
  let newsContext = '';
  
  if (location && Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
    try {
      locationName = await withTimeout(
        getReverseGeocode(location.lat, location.lng),
        ENRICHMENT_TIMEOUT_MS,
        'Reverse geocoding'
      );
      const newsData = await withTimeout(
        fetchLocationNews(locationName, timezone),
        ENRICHMENT_TIMEOUT_MS,
        'Location news'
      );
      
      if (newsData.hasRecentNews && newsData.newsItems.length > 0) {
        newsContext = `\n\nRecent News for ${locationName}:\n${newsData.newsItems
          .map((item: any) => `- ${item.title}: ${item.summary}`)
          .join('\n')}`;
      }
    } catch (error) {
      console.error('Error processing location:', error)
    }
  }

  const drawingContext = formatDrawingContext(drawnFeatures)
  const systemPrompt = `
As a geospatial analyst operating under GUIDING_PRINCIPLES, your task is to analyze the provided satellite image of a geographic location.

**Guiding Principles:**
${Object.entries(GUIDING_PRINCIPLES).map(([key, val]) => `- **${key}**: ${val}`).join('\n')}

**Temporal Context:**
The current local time at this location is ${localTime} (timezone: ${timezone}).
This temporal information is important for understanding the current state and any time-sensitive features visible in the image.

${location ? `**Geographic Coordinates:**
The coordinates provided for this image are: Latitude ${location.lat}, Longitude ${location.lng}.
Location: ${locationName}` : ''}

${newsContext ? `**Recent Context:**
${newsContext}

Please incorporate this recent news context into your analysis where relevant.` : ''}

${drawingContext ? `**User-Drawn Features (authoritative context):**
${drawingContext}
Use these user-drawn areas/lines as primary areas of interest for your analysis.` : ''}

**Analysis Requirements:**

1. **Land Feature Classification:** Identify and describe the different types of land cover visible in the image (e.g., urban areas, forests, water bodies, agricultural fields).
2. **Points of Interest (POI):** Detect and name any significant landmarks, infrastructure (e.g., bridges, major roads), or notable buildings.
3. **Temporal Analysis:** Consider how the time of day and season might affect what's visible in the image.
4. **Coordinate Extraction:** If possible, confirm or refine the geocoordinates (latitude/longitude) of the center of the image.
5. **COG Applicability:** Determine if this location would benefit from Cloud Optimized GeoTIFF (COG) analysis for high-precision temporal or spectral data.
6. **News Integration:** Reference any recent news or events that may be relevant to the current state of the location.
7. **Structured Output:** Return your findings in a structured JSON format including summary, geoJson (if any), news context, and any extracted coordinates or COG information. Use the provided schema. Encode each feature's coordinates as a valid JSON string: use [longitude, latitude] for Point features and nested arrays for Polygon or LineString features.

Your analysis should be based on the visual information in the image, the temporal context provided, and your general knowledge. Do not attempt to access external websites or perform web searches beyond what has been provided.

Analyze the user's prompt and the image to provide a holistic understanding of the location with full temporal and contextual awareness.
`;

  const filteredMessages = messages.filter(msg => msg.role !== 'system');
  if (drawingContext) {
    filteredMessages.push({
      role: 'user',
      content: `Use these measured map drawings as authoritative analysis constraints. Refer to their exact type, measurement, and coordinates in your answer:\n${drawingContext}`
    })
  }

  // Check if any message contains an image (resolution search is specifically for image analysis)
  const hasImage = messages.some((message: any) =>
    Array.isArray(message.content) && 
    message.content.some((part: any) => part.type === 'image')
  )

  // Use streamObject to get partial results.
  return withTimeout(Promise.resolve(streamObject({
    model: await getModel(hasImage),
    system: systemPrompt,
    messages: filteredMessages,
    schema: resolutionSearchSchema,
    temperature: 0,
    maxTokens: 1800,
    abortSignal: createDeadlineSignal(AI_REQUEST_TIMEOUT_MS),
  })), AI_REQUEST_TIMEOUT_MS, 'Resolution analysis')
}
