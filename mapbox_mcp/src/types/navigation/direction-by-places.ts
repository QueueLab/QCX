/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-23 20:10:33
 * @Description: Direction By Places Interface
 */

import { MapboxDirectionsResponse } from "./direction";
import { MapboxGeocodingResponse } from "../search/geocoding";

export interface DirectionsByPlacesError {
  place: string;
  error: string;
}

export interface DirectionsByPlacesResponse {
  geocodingResults: {
    [place: string]: MapboxGeocodingResponse["features"][0] | null;
  };
  directionsResult: MapboxDirectionsResponse | null;
  errors?: DirectionsByPlacesError[];
}
