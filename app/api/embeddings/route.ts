// app/api/embeddings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';
import { fromUrl } from 'geotiff';
import proj4 from 'proj4';
import path from 'path';

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_CREDENTIALS_PATH = process.env.GCP_CREDENTIALS_PATH;

if (!GCP_PROJECT_ID || !GCP_CREDENTIALS_PATH) {
  console.warn('GCP_PROJECT_ID and GCP_CREDENTIALS_PATH are not set. Embeddings API will be unavailable.');
}

const storage = (GCP_PROJECT_ID && GCP_CREDENTIALS_PATH) ? new Storage({
  projectId: GCP_PROJECT_ID,
  keyFilename: GCP_CREDENTIALS_PATH,
}) : null;

const BUCKET_NAME = 'alphaearth_foundations';
const INDEX_FILE_PATH = path.resolve(process.cwd(), 'aef_index.csv');

interface IndexEntry {
  year: string;
  filename: string;
}

let indexData: IndexEntry[] | null = null;

async function getIndexData(): Promise<IndexEntry[]> {
  if (!indexData) {
    try {
      const fileContent = await fs.readFile(INDEX_FILE_PATH, 'utf-8');
      indexData = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });
    } catch (error) {
      console.error('Error reading index file:', error);
      throw new Error('Index file not found or could not be read.');
    }
  }
  return indexData!;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');
  const year = parseInt(searchParams.get('year') || '', 10);

  if (isNaN(lat) || isNaN(lon) || isNaN(year)) {
    return NextResponse.json({ success: false, error: 'Invalid lat, lon, or year.' }, { status: 400 });
  }

  try {
    const index = await getIndexData();
    const entry = index.find(e => e.year === year.toString());

    if (!entry) {
      return NextResponse.json({ success: false, error: 'No data for the given year.' }, { status: 404 });
    }

    if (!storage) {
      return NextResponse.json({ success: false, error: 'GCP storage not configured.' }, { status: 500 });
    }
    const file = storage.bucket(BUCKET_NAME).file(entry.filename);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    const tiff = await fromUrl(url);
    const image = await tiff.getImage();
    const epsgCode = parseInt(image.getGeoKeys().GeoAsciiParams.split('|')[0], 10);
    const proj = proj4(`EPSG:${epsgCode}`, 'EPSG:4326');
    const [x, y] = proj.inverse([lon, lat]);

    const window = [
      Math.floor(x),
      Math.floor(y),
      Math.floor(x) + 1,
      Math.floor(y) + 1,
    ];

    const data = await image.readRasters({ window });
    const rasterData = data[0];
    const embedding = typeof rasterData === 'number' ? [rasterData] : Array.from(rasterData);

    return NextResponse.json({
      success: true,
      location: { lat, lon, year },
      embedding,
      embeddingDimensions: embedding.length,
      masked: false, // This is a simplified assumption
      attribution: 'The AlphaEarth Foundations Satellite Embedding dataset is produced by Google and Google DeepMind.',
      license: 'CC-BY 4.0',
    });
  } catch (error) {
    console.error('Error fetching embedding:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
