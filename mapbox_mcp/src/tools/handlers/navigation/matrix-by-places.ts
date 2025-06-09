/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-21 22:39:37
 * @Description: Matrix By Places Handler
 */

import { z } from "zod";
import { MatrixByPlacesArgsSchema } from "../../../schemas/navigation/matrix-by-places";
import { handleGeocoding } from "../../handlers/search/geocoding";
import { handleMatrix } from "./matrix";
import { MatrixByPlacesError } from "../../../types/navigation/matrix-by-places";

/**
 * Handle Matrix By Places API
 *
 * @param {z.infer<typeof MatrixByPlacesArgsSchema>} args - Matrix by places arguments
 * @returns {Promise<{content: Array<{type: string, text: string}>, isError: boolean}>} - API Response
 */
export async function handleMatrixByPlaces(
  args: z.infer<typeof MatrixByPlacesArgsSchema>
) {
  const {
    places,
    profile,
    annotations,
    language,
    sources,
    destinations,
    fallback_speed,
    depart_at,
  } = args;

  const errors: MatrixByPlacesError[] = [];
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
            matrixResult: null,
            errors: [
              ...errors,
              {
                place: "general",
                error: "Not enough valid coordinates to calculate matrix",
              },
            ],
          }),
        },
      ],
      isError: true,
    };
  }

  // 3. Calculate matrix using the coordinates
  try {
    const matrixResult = await handleMatrix({
      coordinates,
      profile,
      annotations,
      sources,
      destinations,
      fallback_speed,
      depart_at,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            geocodingResults,
            matrixResult: matrixResult.isError
              ? null
              : JSON.parse(matrixResult.content[0].text),
            errors: errors.length > 0 ? errors : undefined,
          }),
        },
      ],
      isError: matrixResult.isError,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            geocodingResults,
            matrixResult: null,
            errors: [
              ...errors,
              {
                place: "general",
                error: `Matrix calculation failed: ${
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
