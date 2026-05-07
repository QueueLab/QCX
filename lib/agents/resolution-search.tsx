import { CoreMessage, streamObject } from 'ai'
import { getModel } from '@/lib/utils'
import { z } from 'zod'
import { tavily } from '@tavily/core'
import { extractRegion } from '@/lib/utils/image-server-utils'

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
        category: z.string().describe('The type of detected object (e.g., "swimming_pool", "solar_panel", "building").'),
        confidence: z.number().min(0).max(1).optional().describe('Detection confidence (0-1).'),
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
  zoomRequests: z.array(z.object({
    region: z.object({
      x: z.number().describe('Normalized x-coordinate (0-1) of the top-left corner.'),
      y: z.number().describe('Normalized y-coordinate (0-1) of the top-left corner.'),
      width: z.number().describe('Normalized width (0-1) of the region.'),
      height: z.number().describe('Normalized height (0-1) of the region.'),
    }).describe('The region of interest for closer inspection.'),
    reason: z.string().describe('Why this region needs closer inspection.'),
    targetObject: z.string().describe('What you are trying to identify in this region.'),
  })).optional().describe('Optional requests for higher-resolution crops of specific regions.'),
  isComplete: z.boolean().describe('Set to true if you have finished your analysis or if no zoom passes are needed.'),
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

export async function resolutionSearch(
  messages: CoreMessage[],
  timezone: string = 'UTC',
  drawnFeatures?: DrawnFeature[],
  location?: { lat: number, lng: number, bounds?: { sw: { lat: number, lng: number }, ne: { lat: number, lng: number } } }
) {
  const now = new Date();
  
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

  let locationName = 'this location';
  let newsContext = '';
  
  if (location?.lat && location?.lng) {
    try {
      locationName = await getReverseGeocode(location.lat, location.lng);
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

  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const originalImagePart = (lastUserMessage?.content as any[]).find(p => p.type === 'image');
  const originalImageData = originalImagePart?.image;
  const originalImageMimeType = originalImagePart?.mimeType;

  if (!originalImageData) {
      throw new Error("Resolution search requires an image.");
  }

  let currentImageData = originalImageData;
  let currentImageMimeType = originalImageMimeType;
  let currentCropBounds = { x: 0, y: 0, width: 1, height: 1 };

  const allFeatures: any[] = [];
  let finalSummary = '';
  let finalCogInfo: z.infer<typeof resolutionSearchSchema>['cogInfo'] = undefined;
  let finalNewsContext: z.infer<typeof resolutionSearchSchema>['newsContext'] = undefined;
  let finalExtractedCoordinates: z.infer<typeof resolutionSearchSchema>['extractedCoordinates'] = undefined;

  const MAX_PASSES = 3;
  let currentPass = 1;
  let isCompleteFlag = false;

  const runIteration = async function* () {
    while (currentPass <= MAX_PASSES && !isCompleteFlag) {
      const isZoomPass = currentPass > 1;

      const systemPrompt = `
As a geospatial analyst, your task is to analyze the provided satellite image of a geographic location.

**Primary Goal:**
Prioritize identifying and locating any specific objects or features requested in the user's prompt.

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

${isZoomPass ? `**ZOOM PASS Context:**
You are currently looking at a zoomed-in CROP of the original image.
- Crop Region (normalized 0-1): X=${currentCropBounds.x}, Y=${currentCropBounds.y}, Width=${currentCropBounds.width}, Height=${currentCropBounds.height}
- All coordinates you provide MUST be relative to THIS CROP (0-1). We will handle mapping them back to the original image space.
- Focus specifically on identifying the target objects mentioned in your previous zoom request.` : ''}

**Analysis Requirements:**

1. **Intent-Driven Detection:** Focus primarily on finding instances of objects requested by the user. For each instance found, create a GeoJSON feature (typically a Point at the center of the object).
2. **Feature Classification:** Use the 'category' property to classify each detected feature (e.g., "swimming_pool", "solar_panel", "building", "tree").
3. **Confidence & Reasoning:** Provide a confidence score (0-1) and a brief description for each identification.
4. **Land Feature Classification:** Identify and describe the different types of land cover visible in the image (e.g., urban areas, forests, water bodies, agricultural fields).
5. **Points of Interest (POI):** Detect and name any significant landmarks, infrastructure, or notable buildings.
6. **Iterative Zoom (Optional):** If you detect areas that likely contain the requested objects but are too small or blurry for definitive identification, you may request a higher-resolution crop by providing normalized coordinates in 'zoomRequests'.
   - 'region': {x, y, width, height} as values between 0 and 1 relative to the CURRENT view.
   - Only request a zoom if it will meaningfully improve your confidence or detection accuracy.
   - Maximize efficiency: request a single crop that covers multiple potential objects if they are close together.
7. **Completion:** Set 'isComplete' to true if you have finished your analysis and no further zoom passes are required. If you are requesting zooms, set it to false.
8. **COG Applicability:** Determine if this location would benefit from Cloud Optimized GeoTIFF (COG) analysis.
9. **Structured Output:** Return your findings in the required structured JSON format.

Your analysis should be based on the visual information in the image, the temporal context provided, and your general knowledge.

Analyze the user's prompt and the image to provide a holistic understanding of the location with full temporal and contextual awareness.
`;

      const filteredMessages = messages.filter(msg => msg.role !== 'system');
      const passMessages = [...filteredMessages];

      if (isZoomPass) {
          const lastMsgIndex = passMessages.length - 1;
          const lastMsg = { ...passMessages[lastMsgIndex] };
          const content = [...(lastMsg.content as any[])];
          const imgIndex = content.findIndex(p => p.type === 'image');
          if (imgIndex !== -1) {
              content[imgIndex] = { ...content[imgIndex], image: currentImageData, mimeType: currentImageMimeType };
          }
          lastMsg.content = content;
          passMessages[lastMsgIndex] = lastMsg;
      }

      const result = await streamObject({
          model: await getModel(true),
          system: systemPrompt,
          messages: passMessages,
          schema: resolutionSearchSchema,
      });

      let passSummary = '';
      for await (const partialObject of result.partialObjectStream) {
          if (partialObject.summary) {
              passSummary = partialObject.summary;
              yield {
                summary: finalSummary + (finalSummary ? '\n\n' : '') + passSummary,
                geoJson: { type: 'FeatureCollection', features: allFeatures }
              };
          }
      }

      const finalPassObject = await result.object;

      if (finalPassObject.geoJson?.features) {
          for (const feature of finalPassObject.geoJson.features) {
              const processedFeature = JSON.parse(JSON.stringify(feature));
              if (isZoomPass && processedFeature.geometry.type === 'Point') {
                  const [relX, relY] = processedFeature.geometry.coordinates;
                  const absoluteX = currentCropBounds.x + (relX * currentCropBounds.width);
                  const absoluteY = currentCropBounds.y + (relY * currentCropBounds.height);

                  if (location?.bounds) {
                      const latRange = location.bounds.ne.lat - location.bounds.sw.lat;
                      const lngRange = location.bounds.ne.lng - location.bounds.sw.lng;
                      const lat = location.bounds.ne.lat - (absoluteY * latRange);
                      const lng = location.bounds.sw.lng + (absoluteX * lngRange);
                      processedFeature.geometry.coordinates = [lng, lat];
                  } else {
                      processedFeature.geometry.coordinates = [absoluteX, absoluteY];
                  }
              } else if (!isZoomPass && processedFeature.geometry.type === 'Point' && location?.bounds) {
                  const [relX, relY] = processedFeature.geometry.coordinates;
                  const latRange = location.bounds.ne.lat - location.bounds.sw.lat;
                  const lngRange = location.bounds.ne.lng - location.bounds.sw.lng;
                  const lat = location.bounds.ne.lat - (relY * latRange);
                  const lng = location.bounds.sw.lng + (relX * lngRange);
                  processedFeature.geometry.coordinates = [lng, lat];
              }
              allFeatures.push(processedFeature);
          }
      }

      finalSummary += (finalSummary ? '\n\n' : '') + finalPassObject.summary;
      finalCogInfo = finalPassObject.cogInfo || finalCogInfo;
      finalNewsContext = finalPassObject.newsContext || finalNewsContext;
      finalExtractedCoordinates = finalPassObject.extractedCoordinates || finalExtractedCoordinates;
      isCompleteFlag = finalPassObject.isComplete;

      if (!isCompleteFlag && finalPassObject.zoomRequests && finalPassObject.zoomRequests.length > 0 && currentPass < MAX_PASSES) {
          const request = finalPassObject.zoomRequests[0];
          const newCrop = await extractRegion(originalImageData, {
              x: currentCropBounds.x + (request.region.x * currentCropBounds.width),
              y: currentCropBounds.y + (request.region.y * currentCropBounds.height),
              width: request.region.width * currentCropBounds.width,
              height: request.region.height * currentCropBounds.height
          });

          currentImageData = newCrop.dataUrl;
          currentImageMimeType = newCrop.mimeType;
          currentCropBounds = {
              x: currentCropBounds.x + (request.region.x * currentCropBounds.width),
              y: currentCropBounds.y + (request.region.y * currentCropBounds.height),
              width: request.region.width * currentCropBounds.width,
              height: request.region.height * currentCropBounds.height
          };
          currentPass++;
      } else {
          isCompleteFlag = true;
      }

      yield {
          summary: finalSummary,
          geoJson: { type: 'FeatureCollection', features: allFeatures },
          cogInfo: finalCogInfo,
          newsContext: finalNewsContext,
          extractedCoordinates: finalExtractedCoordinates
      };
    }
  };

  const finalObjectPromise = (async () => {
    const generator = runIteration();
    let lastValue: any = {};
    for await (const value of generator) {
      lastValue = value;
    }
    return lastValue;
  })();

  return {
    partialObjectStream: runIteration(),
    object: finalObjectPromise
  } as any;
}
