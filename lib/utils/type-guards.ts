import { LocationResponse, MapCommand, GeoJSONFeatureCollection } from '../types/custom';

/**
 * Type guard to check if an object is a valid MapCommand.
 * @param obj The object to check.
 * @returns True if the object is a MapCommand, false otherwise.
 */
function isMapCommand(obj: any): obj is MapCommand {
  if (typeof obj !== 'object' || obj === null) return false;

  const hasCommand = typeof obj.command === 'string' && ['flyTo', 'easeTo', 'fitBounds'].includes(obj.command);
  const hasParams = typeof obj.params !== 'undefined';

  return hasCommand && hasParams;
}

/**
 * Type guard to check if an object is a valid GeoJSONFeatureCollection.
 * @param obj The object to check.
 * @returns True if the object is a GeoJSONFeatureCollection, false otherwise.
 */
function isGeoJSONFeatureCollection(obj: any): obj is GeoJSONFeatureCollection {
    if (typeof obj !== 'object' || obj === null) return false;

    const hasType = obj.type === 'FeatureCollection';
    const hasFeatures = Array.isArray(obj.features);

    return hasType && hasFeatures;
}

/**
 * Type guard to check if an object is a valid LocationResponse.
 * This function provides runtime validation for the structure of LocationResponse.
 * @param obj The object to be checked.
 * @returns True if the object conforms to the LocationResponse interface, false otherwise.
 */
export function isLocationResponse(obj: any): obj is LocationResponse {
  if (typeof obj !== 'object' || obj === null) {
    console.error("Validation failed: Input is not an object or is null.");
    return false;
  }

  // 1. Check for the 'type' property (must be 'tool')
  const hasType = obj.type === 'tool';
  if (!hasType) {
    console.error("Validation failed: 'type' property is missing or not 'tool'.", obj);
    return false;
  }

  // 2. Check for the 'text' property (must be a string)
  const hasText = typeof obj.text === 'string';
  if (!hasText) {
    console.error("Validation failed: 'text' property is missing or not a string.", obj);
    return false;
  }

  // 3. Check for the 'geojson' property (must be a GeoJSONFeatureCollection or null)
  const hasGeojson = obj.geojson === null || isGeoJSONFeatureCollection(obj.geojson);
   if (!hasGeojson) {
    console.error("Validation failed: 'geojson' property is not a valid GeoJSONFeatureCollection or null.", obj);
    return false;
  }

  // 3. Check for the 'map_commands' property (optional, but if it exists, must be an array of MapCommands or null)
  const hasMapCommands =
    !('map_commands' in obj) || // Property doesn't exist (which is valid)
    obj.map_commands === null || // Property is null (which is valid)
    (Array.isArray(obj.map_commands) && obj.map_commands.every(isMapCommand)); // Property is an array of valid MapCommands

  if (!hasMapCommands) {
    console.error("Validation failed: 'map_commands' property is not a valid array of MapCommand objects or null.", obj);
    return false;
  }

  return true;
}