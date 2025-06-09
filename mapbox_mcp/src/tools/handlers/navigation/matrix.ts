/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-21 22:39:37
 * @Description: Matrix Handler
 */

import { z } from "zod";
import { MapboxMatrixResponse } from "../../../types/navigation/matrix";
import { MatrixArgsSchema } from "../../../schemas/navigation/matrix";
import { MAPBOX_ACCESS_TOKEN } from "../../../config/index";

/**
 * Handle Matrix API
 *
 * @param {z.infer<typeof MatrixArgsSchema>} args - Matrix arguments
 * @returns {Promise<{content: Array<{type: string, text: string}>, isError: boolean}>} - Matrix API Response
 */
export async function handleMatrix(args: z.infer<typeof MatrixArgsSchema>) {
  const {
    coordinates,
    profile,
    annotations,
    approaches,
    bearings,
    sources,
    destinations,
    fallback_speed,
    depart_at,
  } = args;

  // Convert coordinates to string format
  const coordinatesString = coordinates
    .map((coord) => `${coord.longitude},${coord.latitude}`)
    .join(";");

  // Build URL
  const url = new URL(
    `https://api.mapbox.com/directions-matrix/v1/mapbox/${profile}/${coordinatesString}`
  );

  // Add required parameters
  url.searchParams.append("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.append("annotations", annotations);

  // Add optional parameters
  if (approaches?.length) {
    url.searchParams.append("approaches", approaches.join(";"));
  }

  if (bearings?.length) {
    url.searchParams.append(
      "bearings",
      bearings.map((b) => `${b.angle},${b.deviation}`).join(";")
    );
  }

  if (sources?.length) {
    url.searchParams.append("sources", sources.join(";"));
  }

  if (destinations?.length) {
    url.searchParams.append("destinations", destinations.join(";"));
  }

  if (fallback_speed !== undefined) {
    url.searchParams.append("fallback_speed", fallback_speed.toString());
  }

  if (depart_at) {
    url.searchParams.append("depart_at", depart_at);
  }

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

    const data = (await response.json()) as MapboxMatrixResponse;

    // Handle Business Logic Error
    if (data.code !== "Ok") {
      return {
        content: [
          {
            type: "text",
            text: `Matrix calculation failed: ${data.code}`,
          },
        ],
        isError: true,
      };
    }

    // Format the response
    const result = {
      code: data.code,
      durations: data.durations,
      distances: data.distances,
      sources: data.sources.map((source) => ({
        name: source.name,
        location: source.location,
        distance: source.distance,
      })),
      destinations: data.destinations.map((dest) => ({
        name: dest.name,
        location: dest.location,
        distance: dest.distance,
      })),
    };

    // Success Case
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
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
