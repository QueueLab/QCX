/*
 * @Author: AidenYangX
 * @Email: xscs709560271@gmail.com
 * @Date: 2024-12-23 19:50:33
 * @Description: Matrix By Places Interface
 */

import { MapboxMatrixResponse } from "./matrix";
import { MapboxGeocodingResponse } from "../search/geocoding";

export interface MatrixByPlacesError {
  place: string;
  error: string;
}

export interface MatrixByPlacesResponse {
  geocodingResults: {
    [place: string]: MapboxGeocodingResponse["features"][0] | null;
  };
  matrixResult: MapboxMatrixResponse | null;
  errors?: MatrixByPlacesError[];
}
