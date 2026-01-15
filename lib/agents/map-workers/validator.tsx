import {
  GeoJSONFeatureCollectionSchema,
  MapCommandSchema,
  ValidationResult,
  GeoJSONFeatureCollection,
  MapCommand,
} from '@/lib/types/map-schemas';
import { z } from 'zod';

/**
 * Validator Worker Agent
 * Validates GeoJSON and map commands using Zod schemas
 */

export function validateGeoJSON(
  geojson: unknown
): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: string[] = [];

  try {
    // Validate with Zod schema
    GeoJSONFeatureCollectionSchema.parse(geojson);

    // Additional semantic validation
    const data = geojson as GeoJSONFeatureCollection;
    
    if (data.features.length === 0) {
      warnings.push('GeoJSON FeatureCollection contains no features');
    }

    // Check for duplicate features
    const featureIds = data.features
      .filter(f => f.id !== undefined)
      .map(f => f.id);
    
    const duplicateIds = featureIds.filter(
      (id, index) => featureIds.indexOf(id) !== index
    );
    
    if (duplicateIds.length > 0) {
      warnings.push(`Duplicate feature IDs found: ${duplicateIds.join(', ')}`);
    }

    // Check coordinate validity
    data.features.forEach((feature, idx) => {
      const geom = feature.geometry;
      
      if (geom.type === 'Point') {
        const [lon, lat] = geom.coordinates as [number, number];
        if (Math.abs(lon) > 180 || Math.abs(lat) > 90) {
          errors.push({
            field: `features[${idx}].geometry.coordinates`,
            message: `Invalid coordinates: [${lon}, ${lat}]. Longitude must be -180 to 180, latitude must be -90 to 90`,
            severity: 'error',
          });
        }
      } else if (geom.type === 'LineString') {
        const coords = geom.coordinates as [number, number][];
        if (coords.length < 2) {
          errors.push({
            field: `features[${idx}].geometry.coordinates`,
            message: 'LineString must have at least 2 coordinates',
            severity: 'error',
          });
        }
      } else if (geom.type === 'Polygon') {
        const rings = geom.coordinates as [number, number][][];
        rings.forEach((ring, ringIdx) => {
          if (ring.length < 4) {
            errors.push({
              field: `features[${idx}].geometry.coordinates[${ringIdx}]`,
              message: 'Polygon ring must have at least 4 coordinates',
              severity: 'error',
            });
          }
          
          // Check if ring is closed
          const first = ring[0];
          const last = ring[ring.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            errors.push({
              field: `features[${idx}].geometry.coordinates[${ringIdx}]`,
              message: 'Polygon ring must be closed (first and last coordinates must match)',
              severity: 'error',
            });
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          severity: 'error' as const,
        })),
        warnings,
      };
    }

    return {
      valid: false,
      errors: [{
        field: 'geojson',
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      }],
      warnings,
    };
  }
}

export function validateMapCommand(
  command: unknown
): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: string[] = [];

  try {
    // Validate with Zod schema
    MapCommandSchema.parse(command);

    const cmd = command as MapCommand;

    // Semantic validation
    if (cmd.command === 'flyTo' || cmd.command === 'easeTo') {
      if (!cmd.params.center && !cmd.params.zoom && !cmd.params.pitch && !cmd.params.bearing) {
        warnings.push(`${cmd.command} command has no parameters - will have no effect`);
      }
    }

    if (cmd.command === 'fitBounds') {
      if (!cmd.params.bounds) {
        errors.push({
          field: 'params.bounds',
          message: 'fitBounds command requires bounds parameter',
          severity: 'error',
        });
      } else {
        const [[west, south], [east, north]] = cmd.params.bounds;
        if (west >= east) {
          errors.push({
            field: 'params.bounds',
            message: `Invalid bounds: west (${west}) must be less than east (${east})`,
            severity: 'error',
          });
        }
        if (south >= north) {
          errors.push({
            field: 'params.bounds',
            message: `Invalid bounds: south (${south}) must be less than north (${north})`,
            severity: 'error',
          });
        }
      }
    }

    if (cmd.command === 'setCenter') {
      if (!cmd.params.center) {
        errors.push({
          field: 'params.center',
          message: 'setCenter command requires center parameter',
          severity: 'error',
        });
      }
    }

    if (cmd.command === 'setZoom') {
      if (cmd.params.zoom === undefined) {
        errors.push({
          field: 'params.zoom',
          message: 'setZoom command requires zoom parameter',
          severity: 'error',
        });
      }
    }

    // Check for reasonable values
    if (cmd.params.zoom !== undefined) {
      if (cmd.params.zoom < 0 || cmd.params.zoom > 22) {
        warnings.push(`Unusual zoom level: ${cmd.params.zoom}. Typical range is 0-22`);
      }
    }

    if (cmd.params.duration !== undefined && cmd.params.duration > 10000) {
      warnings.push(`Very long animation duration: ${cmd.params.duration}ms. Consider shorter duration for better UX`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          severity: 'error' as const,
        })),
        warnings,
      };
    }

    return {
      valid: false,
      errors: [{
        field: 'command',
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      }],
      warnings,
    };
  }
}

export function validateMapCommands(
  commands: unknown[]
): ValidationResult {
  const allErrors: ValidationResult['errors'] = [];
  const allWarnings: string[] = [];
  const invalidIndices: number[] = [];

  commands.forEach((cmd, idx) => {
    const result = validateMapCommand(cmd);
    
    if (!result.valid) {
      invalidIndices.push(idx);
    }

    result.errors.forEach(err => {
      allErrors.push({
        ...err,
        field: `commands[${idx}].${err.field}`,
      });
    });

    if (result.warnings) {
      result.warnings.forEach(warn => {
        allWarnings.push(`commands[${idx}]: ${warn}`);
      });
    }
  });

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
    invalidIndices: invalidIndices.length > 0 ? invalidIndices : undefined,
  };
}
