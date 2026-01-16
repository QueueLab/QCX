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
  throw new Error('GCP_PROJECT_ID and GCP_CREDENTIALS_PATH must be set in the environment.');
}

const storage = new Storage({
  projectId: GCP_PROJECT_ID,
  keyFilename: GCP_CREDENTIALS_PATH,
});

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

    const file = storage.bucket(BUCKET_NAME).file(entry.filename);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    const [fileContents] = await file.download();
    const blob = new Blob([fileContents], { type: 'image/tiff' });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'image/tiff',
      },
    });
  } catch (error) {
    console.error('Error fetching embedding:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
