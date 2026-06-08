import { CoreMessage, streamObject } from 'ai'
import { getModel } from '@/lib/utils'
import { tavily } from '@tavily/core'
import { resolutionSearchSchema } from '@/lib/schema/resolution-search'

// This agent is now a pure data-processing module, with no UI dependencies.

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
As a geospatial analyst, your task is to analyze the provided satellite image of a geographic location.

**CRITICAL GUIDELINES:**
1. **ACCURACY & CONFIDENCE:** Your analysis MUST be grounded strictly in the visual evidence of the image. Do NOT generate GeoJSON features (points, polygons) for landmarks or features that you are not 100% confident in. If you are unsure, omit the GeoJSON feature entirely.
2. **STRICT CONTEXTUAL ALIGNMENT:** Prioritize the user's intent and any user-drawn features as the primary subjects of analysis. Do NOT provide "general" points of interest unless they directly relate to the analysis focus or the user's query.
3. **NO RANDOM OVERLAYS:** Ensure that any boxes or markers you generate are accurately placed within the spatial context of the image and clearly correspond to real objects visible in the satellite view. Avoid "random" or disconnected labeling.
4. **SUPPRESSION OF NOISE:** It is better to return fewer, accurate results than many low-confidence or out-of-context features.

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
Use these user-drawn areas/lines as primary areas of interest for your analysis.
IMPORTANT: In your summary, explicitly state what features you are analyzing and why. Any GeoJSON you generate should strictly align with or augment these drawn areas.` : ''}

**Analysis Requirements:**

1. **Land Feature Classification:** Identify and describe the different types of land cover visible in the image (e.g., urban areas, forests, water bodies, agricultural fields).
2. **Points of Interest (POI):** Detect and name any significant landmarks, infrastructure (e.g., bridges, major roads), or notable buildings ONLY if they are clearly visible.
3. **Temporal Analysis:** Consider how the time of day and season might affect what's visible in the image.
4. **Coordinate Extraction:** If possible, confirm or refine the geocoordinates (latitude/longitude) of the center of the image.
5. **COG Applicability:** Determine if this location would benefit from Cloud Optimized GeoTIFF (COG) analysis for high-precision temporal or spectral data.
6. **News Integration:** Reference any recent news or events that may be relevant to the current state of the location.
7. **Structured Output:** Return your findings in a structured JSON format including summary, geoJson (if any), news context, and any extracted coordinates or COG information. Use the provided schema.
8. **Contextual Labeling:** Generate highly specific, descriptive labels for the map images that reflect the primary analysis focus. Avoid generic labels like "Mapbox" or "Google".
   - If user-drawn features are present, the labels MUST reference them (e.g., "Analysis of drawn ${drawnFeatures?.[0]?.type || 'area'}: [feature type]").
   - If a specific location is known, include it (e.g., "[${locationName}] satellite view - [Focus Area]").
   - The 'analysisFocus' field should capture the specific theme of this analysis (e.g., "Coastal erosion assessment", "Industrial zone monitoring").

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
