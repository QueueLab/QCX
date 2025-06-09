/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-23 20:11:37
 * @Description: Direction Handler
 */

import { z } from "zod";
import { MapboxDirectionsResponse } from "../../../types/index";
import { CoordinatesSchema } from "../../../schemas/index";
import { MAPBOX_ACCESS_TOKEN } from "../../../config/index";

/**
 * Handle Directions API
 *
 * @param {z.infer<typeof CoordinatesSchema>} coordinates - Coordinates
 * @param {string} profile - Navigation mode
 * @returns {Promise<{content: Array<{type: string, text: string}>, isError: boolean}>} - Directions API Response
 */
export async function handleDirections(
  coordinates: z.infer<typeof CoordinatesSchema>,
  profile: string = "driving"
) {
  const coordinatesString = coordinates
    .map((coord) => `${coord.longitude},${coord.latitude}`)
    .join(";");

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinatesString}`
  );
  url.searchParams.append("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.append("geometries", "geojson");

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

    const data = (await response.json()) as MapboxDirectionsResponse;

    // Handle Business Logic Error (HTTP Status Code < 500)
    if (response.status < 500 && data.code !== "Ok") {
      return {
        content: [
          {
            type: "text",
            text: data.message || `Route Planning Failed: ${data.code}`,
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
            routes: data.routes.map((route) => ({
              distance: route.distance,
              duration: route.duration,
              steps: route.legs[0].steps.map((step) => ({
                instruction: step.maneuver.instruction,
                distance: step.distance,
                duration: step.duration,
              })),
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
