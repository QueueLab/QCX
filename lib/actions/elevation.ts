import { generateCoordinateGrid, getElevationStats, ElevationPoint } from '@/lib/utils/elevation';

export async function fetchElevationData(bounds: [number, number, number, number], gridSize: number = 20) {
    const points = generateCoordinateGrid(bounds, gridSize);
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) throw new Error('Mapbox access token not configured');

    const batchSize = 10;
    const results: ElevationPoint[] = [];

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

    return { points: validPoints, statistics };
}
