import { NextRequest, NextResponse } from 'next/server';
import * as turf from '@turf/turf';

/**
 * GET /api/elevation
 *
 * Fetches elevation data for a grid of points within the given bounds.
 * Uses Mapbox Terrain vector tileset to get elevation values.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boundsParam = searchParams.get('bounds');
    const gridSizeParam = searchParams.get('gridSize');
    const geometryParam = searchParams.get('geometry');

    if (!boundsParam) {
      return NextResponse.json(
        { error: 'Missing required parameter: bounds' },
        { status: 400 }
      );
    }

    let bounds;
    try {
      bounds = JSON.parse(boundsParam);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid bounds parameter' }, { status: 400 });
    }

    const gridSize = gridSizeParam ? parseInt(gridSizeParam) : 20;
    const geometry = geometryParam ? JSON.parse(geometryParam) : null;

    const [west, south, east, north] = bounds;

    const points: Array<{ lng: number; lat: number; elevation: number | null }> = [];
    const lonStep = (east - west) / gridSize;
    const latStep = (north - south) / gridSize;

    const polygon = geometry ? turf.polygon(geometry.coordinates) : null;

    for (let i = 0; i <= gridSize; i++) {
      for (let j = 0; j <= gridSize; j++) {
        const lng = west + (lonStep * i);
        const lat = south + (latStep * j);

        if (polygon) {
          const point = turf.point([lng, lat]);
          if (!turf.booleanPointInPolygon(point, polygon)) {
            continue;
          }
        }

        points.push({ lng, lat, elevation: null });
      }
    }

    const token = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    // Fetch elevation data using Mapbox Terrain vector tiles (v2)
    // This tileset contains contour lines with 'ele' property
    const elevationPromises = points.map(async (point) => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${point.lng},${point.lat}.json?access_token=${token}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            // Find the feature with the highest elevation in this point's vicinity
            // or just take the first one if it has 'ele'
            const elevations = data.features
              .map((f: any) => f.properties.ele)
              .filter((e: any) => e !== undefined);

            if (elevations.length > 0) {
              point.elevation = Math.max(...elevations);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching elevation for ${point.lng},${point.lat}:`, error);
      }
      return point;
    });

    const elevationData = await Promise.all(elevationPromises);
    const validPoints = elevationData.filter(p => p.elevation !== null);

    if (validPoints.length === 0) {
      return NextResponse.json({
        success: true,
        points: [],
        statistics: { min: 0, max: 0, average: 0, count: 0 },
        bounds,
        gridSize,
      });
    }

    const elevations = validPoints.map(p => p.elevation as number);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const avgElevation = elevations.reduce((sum, e) => sum + e, 0) / elevations.length;

    return NextResponse.json({
      success: true,
      points: validPoints,
      statistics: {
        min: minElevation,
        max: maxElevation,
        average: Math.round(avgElevation * 10) / 10,
        count: validPoints.length,
      },
      bounds,
      gridSize,
    });

  } catch (error) {
    console.error('Error fetching elevation data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch elevation data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { features, gridSize = 20 } = body;

    if (!features || !Array.isArray(features)) {
      return NextResponse.json(
        { error: 'Missing or invalid features array' },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      features.map(async (feature: any) => {
        if (feature.geometry.type !== 'Polygon') {
          return null;
        }

        const bbox = turf.bbox(feature);
        const params = new URLSearchParams({
          bounds: JSON.stringify(bbox),
          gridSize: gridSize.toString(),
          geometry: JSON.stringify(feature.geometry),
        });

        const url = new URL(`/api/elevation?${params}`, req.url);
        const response = await GET(new NextRequest(url));
        return await response.json();
      })
    );

    return NextResponse.json({
      success: true,
      results: results.filter(r => r !== null),
    });

  } catch (error) {
    console.error('Error in batch elevation query:', error);
    return NextResponse.json(
      {
        error: 'Failed to process batch elevation query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
