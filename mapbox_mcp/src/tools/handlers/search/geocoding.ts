/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-21 22:39:37
 * @Description: Geocoding Handler
 */

import { z } from "zod";
import { MapboxGeocodingResponse } from "../../../types/search/geocoding";
import { GeocodingArgsSchema } from "../../../schemas/search/geocoding";
import { MAPBOX_ACCESS_TOKEN } from "../../../config/index";

/**
 * Handle Geocoding API
 *
 * @param {z.infer<typeof GeocodingArgsSchema>} args - Geocoding arguments
 * @returns {Promise<{content: Array<{type: string, text: string}>, isError: boolean}>} - Geocoding API Response
 */
export async function handleGeocoding(
  args: z.infer<typeof GeocodingArgsSchema>
) {
  const { searchText, limit, types, language, fuzzyMatch } = args;

  const url = new URL(
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
      encodeURIComponent(searchText) +
      ".json"
  );
  url.searchParams.append("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.append("limit", limit.toString());

  if (types?.length) {
    url.searchParams.append("types", types.join(","));
  }
  if (language) {
    url.searchParams.append("language", language);
  }
  url.searchParams.append("fuzzyMatch", fuzzyMatch.toString());

  try {
    const response = await fetch(url.toString());

    // Handle Server Error (HTTP Status Code >= 500)
    if (response.status >= 500) {
      return {
        content: [
          {
            type: "text",
            text: `Mapbox Server Error: HTTP ${response.status}`,
          },
        ],
        isError: true,
      };
    }

    const data = (await response.json()) as MapboxGeocodingResponse;

    // Handle Business Logic Error
    if (!data.features || data.features.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No results found for the given search text",
          },
        ],
        isError: true,
      };
    }

    // Success Case
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            results: data.features.map((feature) => ({
              name: feature.text,
              full_address: feature.place_name,
              coordinates: {
                longitude: feature.center[0],
                latitude: feature.center[1],
              },
              type: feature.place_type[0],
              relevance: feature.relevance,
              properties: feature.properties,
            })),
          }),
        },
      ],
      isError: false,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Request Failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}
