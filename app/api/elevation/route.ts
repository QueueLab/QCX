import { NextRequest, NextResponse } from 'next/server';
import { fetchElevationData } from '@/lib/actions/elevation';

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

    const bounds = JSON.parse(boundsParam) as [number, number, number, number];
    const gridSize = gridSizeParam ? parseInt(gridSizeParam) : 20;

    const data = await fetchElevationData(bounds, gridSize);

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching elevation data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch elevation data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
