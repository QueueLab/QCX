import { generateObject } from 'ai';
import { getModel } from '@/lib/utils';
import {
  GeoJSONParserOutputSchema,
  GeoJSONParserOutput,
} from '@/lib/types/map-schemas';

const GEOJSON_PARSER_PROMPT = `You are a specialized GeoJSON extraction agent. Your task is to analyze text and extract geographic data into valid GeoJSON format.

RULES:
1. Extract ALL locations, addresses, coordinates, or geographic references from the text
2. Convert each location into a GeoJSON Feature with appropriate geometry type:
   - Point: Single location or address
   - LineString: Route, path, or connection between points
   - Polygon: Area, boundary, or region
3. Use WGS84 coordinate system: [longitude, latitude]
4. Longitude must be between -180 and 180
5. Latitude must be between -90 and 90
6. Include meaningful properties for each feature (name, description, type, etc.)
7. If coordinates are not explicitly provided, DO NOT guess - mark for geocoding
8. Return confidence score based on data quality and completeness

OUTPUT STRUCTURE:
- geojson: Valid GeoJSON FeatureCollection or null if no geographic data found
- confidence: 0.0 to 1.0 (1.0 = explicit coordinates, 0.5 = addresses need geocoding, 0.0 = no geo data)
- extractedLocations: List of location strings that need geocoding
- warnings: Any issues or ambiguities encountered

EXAMPLES:

Input: "The Eiffel Tower is located at 48.8584° N, 2.2945° E"
Output: {
  "geojson": {
    "type": "FeatureCollection",
    "features": [{
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [2.2945, 48.8584]
      },
      "properties": {
        "name": "Eiffel Tower",
        "description": "Located at 48.8584° N, 2.2945° E"
      }
    }]
  },
  "confidence": 1.0,
  "extractedLocations": [],
  "warnings": []
}

Input: "Show me the route from New York to Boston"
Output: {
  "geojson": null,
  "confidence": 0.5,
  "extractedLocations": ["New York", "Boston"],
  "warnings": ["Coordinates not provided, geocoding required"]
}

Input: "The weather is nice today"
Output: {
  "geojson": null,
  "confidence": 0.0,
  "extractedLocations": [],
  "warnings": ["No geographic data found in text"]
}`;

/**
 * GeoJSON Parser Worker Agent
 * Extracts and validates geographic data from text
 */
export async function geojsonParser(
  text: string
): Promise<GeoJSONParserOutput> {
  const model = getModel();

  try {
    const { object } = await generateObject({
      model,
      schema: GeoJSONParserOutputSchema,
      prompt: `${GEOJSON_PARSER_PROMPT}\n\nText to analyze:\n${text}`,
      maxTokens: 2048,
    });

    // Additional validation
    if (object.geojson) {
      // Validate coordinate ranges
      for (const feature of object.geojson.features) {
        const coords = feature.geometry.coordinates;
        if (feature.geometry.type === 'Point') {
          const [lon, lat] = coords as [number, number];
          if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
            object.warnings = object.warnings || [];
            object.warnings.push(`Invalid coordinates for feature: [${lon}, ${lat}]`);
            object.confidence = Math.min(object.confidence, 0.5);
          }
        }
      }
    }

    return object;
  } catch (error) {
    console.error('GeoJSON Parser error:', error);
    return {
      geojson: null,
      confidence: 0,
      extractedLocations: [],
      warnings: [`Parser error: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}
