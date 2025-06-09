/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-21 22:39:37
 * @Description: Direction By Places Handler
 */

import { z } from "zod";
import { DirectionsByPlacesArgsSchema } from "../../../schemas/navigation/direction-by-places";
import { handleGeocoding } from "../../handlers/search/geocoding";
import { handleDirections } from "./direction";
import { DirectionsByPlacesError } from "../../../types/navigation/direction-by-places";

/**
 * Handle Directions By Places API
 *
 * @param {z.infer<typeof DirectionsByPlacesArgsSchema>} args - Direction by places arguments
 * @returns {Promise<{content: Array<{type: string, text: string}>, isError: boolean}>} - API Response
 */
export async function handleDirectionsByPlaces(
  args: z.infer<typeof DirectionsByPlacesArgsSchema>
) {
  const { places, profile, language } = args;
  const errors: DirectionsByPlacesError[] = [];
  const coordinates: { longitude: number; latitude: number }[] = [];
  const geocodingResults: Record<string, any> = {};

  // 1. Geocode each place
  for (const place of places) {
    try {
      const geocodingResult = await handleGeocoding({
        searchText: place,
        limit: 1,
        language,
        fuzzyMatch: true,
      });

      if (geocodingResult.isError || !geocodingResult.content[0]) {
        errors.push({
          place,
          error: `Geocoding failed: ${
            JSON.parse(geocodingResult.content[0].text).message ||
            "No results found"
          }`,
        });
        geocodingResults[place] = null;
        continue;
      }

      const feature = JSON.parse(geocodingResult.content[0].text).results[0];
      geocodingResults[place] = feature;
      coordinates.push(feature.coordinates);
    } catch (error) {
      errors.push({
        place,
        error: `Geocoding failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      geocodingResults[place] = null;
    }
  }

  // 2. If we don't have enough valid coordinates, return error
  if (coordinates.length < 2) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            geocodingResults,
            directionsResult: null,
            errors: [
              ...errors,
              {
                place: "general",
                error: "Not enough valid coordinates to calculate route",
              },
            ],
          }),
        },
      ],
      isError: true,
    };
  }

  // 3. Get directions using the coordinates
  try {
    const directionsResult = await handleDirections(coordinates, profile);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            geocodingResults,
            directionsResult: directionsResult.isError
              ? null
              : JSON.parse(directionsResult.content[0].text),
            errors: errors.length > 0 ? errors : undefined,
          }),
        },
      ],
      isError: directionsResult.isError,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            geocodingResults,
            directionsResult: null,
            errors: [
              ...errors,
              {
                place: "general",
                error: `Directions calculation failed: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            ],
          }),
        },
      ],
      isError: true,
    };
  }
}
