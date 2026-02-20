import { NextRequest, NextResponse } from 'next/server';
import { generateCoordinateGrid, decodeMapboxTerrainRGB, getElevationStats } from '@/lib/utils/elevation';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boundsParam = searchParams.get('bounds');
    const gridSizeParam = searchParams.get('gridSize');

    if (!boundsParam) {
      return NextResponse.json(
        { error: 'Missing required parameter: bounds' },
        { status: 400 }
      );
    }

    const bounds = JSON.parse(boundsParam) as [number, number, number, number]; // [west, south, east, north]
    const gridSize = gridSizeParam ? parseInt(gridSizeParam) : 20;

    // Generate grid points
    // generateCoordinateGrid expects bounds: [west, south, east, north]
    // But check the implementation I just wrote:
    // export function generateCoordinateGrid(bounds: [number, number, number, number], gridSize: number = 20)
    // inside: const [west, south, east, north] = bounds;
    // Implementation seems consistent.

    const points = generateCoordinateGrid(bounds, gridSize);

    // Fetch elevation data
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      return NextResponse.json(
        { error: 'Mapbox access token not configured' },
        { status: 500 }
      );
    }

    // Mapbox Tilequery API allows multiple coordinates? No, it's one by one or comma separated for features, but for terrain-rgb tilequery usually returns value at point.
    // The user snippet did fetch per point. I will do parallel fetch with limit.
    // Since runtime is edge, we can do parallel fetches.

    // Batching strategy: Mapbox Tilequery API supports multiple queries?
    // "Retrieve features from vector tiles based on a longitude and latitude."
    // It doesn't support batch points in one request. We must make N requests.
    // N = 20*20 = 400 requests. This might be too many for browser fetch limit or edge limit.
    // But let's try. Maybe reduce grid size default if needed. 400 is a lot.
    // User snippet uses 20x20.

    // Limit concurrency to avoid hitting rate limits or fetch errors
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      const batchPromises = batch.map(async (point) => {
        try {
          const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${point.lng},${point.lat}.json?layers=contour&limit=1&access_token=${mapboxToken}`;

          const response = await fetch(url);
          if (!response.ok) return { ...point, elevation: 0 };

          const data = await response.json();
          const elevation = data.features && data.features.length > 0 ? data.features[0].properties?.ele : 0;
          return { ...point, elevation };
        } catch (e) {
          console.error(e);
          return { ...point, elevation: 0 };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const validPoints = results.filter(p => p.elevation !== undefined);
    const statistics = getElevationStats(validPoints);

    return NextResponse.json({
      points: validPoints,
      statistics
    });

  } catch (error) {
    console.error('Error fetching elevation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch elevation data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
