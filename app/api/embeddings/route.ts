// app/api/embeddings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fromUrl } from 'geotiff';
import proj4 from 'proj4';

// Configuration from environment variables
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'gen-lang-client-0663384776';
const GCP_CREDENTIALS_PATH = process.env.GCP_CREDENTIALS_PATH || '/home/ubuntu/gcp_credentials.json';
const AEF_INDEX_PATH = process.env.AEF_INDEX_PATH || path.join(process.cwd(), 'aef_index.csv');

// Initialize GCS client
const storage = new Storage({
  keyFilename: GCP_CREDENTIALS_PATH,
  projectId: GCP_PROJECT_ID,
});

// Load and parse the index file
let indexData: any[] | null = null;

function loadIndex() {
  if (indexData) return indexData;
  
  if (!fs.existsSync(AEF_INDEX_PATH)) {
    throw new Error(
      `AlphaEarth index file not found at ${AEF_INDEX_PATH}. ` +
      'Please run the download_index.js script to download it.'
    );
  }
  
  const fileContent = fs.readFileSync(AEF_INDEX_PATH, 'utf-8');
  
  indexData = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });
  
  console.log(`Loaded AlphaEarth index with ${indexData.length} entries`);
  
  return indexData;
}

// Function to check if a point is within bounds
function isPointInBounds(
  lat: number,
  lon: number,
  south: number,
  north: number,
  west: number,
  east: number
): boolean {
  return lat >= south && lat <= north && lon >= west && lon <= east;
}

// Function to find the file containing the given location
function findFileForLocation(lat: number, lon: number, year: number) {
  const index = loadIndex();
  
  for (const entry of index) {
    if (parseInt(entry.year) !== year) continue;
    
    const south = parseFloat(entry.wgs84_south);
    const north = parseFloat(entry.wgs84_north);
    const west = parseFloat(entry.wgs84_west);
    const east = parseFloat(entry.wgs84_east);
    
    if (isPointInBounds(lat, lon, south, north, west, east)) {
      return {
        path: entry.path,
        crs: entry.crs,
        utmZone: entry.utm_zone,
        year: entry.year,
        bounds: { south, north, west, east },
        utmBounds: {
          west: parseFloat(entry.utm_west),
          south: parseFloat(entry.utm_south),
          east: parseFloat(entry.utm_east),
          north: parseFloat(entry.utm_north),
        },
      };
    }
  }
  
  return null;
}

// Function to dequantize raw pixel values
// Formula from AlphaEarth documentation: (value/127.5)^2 * sign(value)
function dequantize(rawValue: number): number | null {
  if (rawValue === -128) return null; // NoData marker
  const normalized = rawValue / 127.5;
  return Math.pow(normalized, 2) * Math.sign(rawValue);
}

// Function to convert WGS84 lat/lon to UTM coordinates using proj4
function latLonToUTM(lat: number, lon: number, epsgCode: string): { x: number; y: number } {
  const wgs84 = 'EPSG:4326';
  const utm = epsgCode;
  
  // Transform coordinates [lon, lat] -> [x, y]
  const [x, y] = proj4(wgs84, utm, [lon, lat]);
  
  return { x, y };
}

/**
 * GET /api/embeddings
 * 
 * Retrieves a 64-dimensional AlphaEarth satellite embedding for a given location and year.
 * 
 * Query Parameters:
 * - lat: Latitude in decimal degrees (-90 to 90)
 * - lon: Longitude in decimal degrees (-180 to 180)
 * - year: Year (2017 to 2024)
 * 
 * Returns:
 * - embedding: Array of 64 floating-point values representing the location
 * - location: The requested coordinates and year
 * - fileInfo: Metadata about the source GeoTIFF file
 * - utmCoordinates: The location in UTM projection
 * - pixelCoordinates: The exact pixel within the source file
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');
    const yearParam = searchParams.get('year');

    // Validate parameters
    if (!latParam || !lonParam || !yearParam) {
      return NextResponse.json(
        { error: 'Missing required parameters: lat, lon, year' },
        { status: 400 }
      );
    }

    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);
    const year = parseInt(yearParam);

    if (isNaN(lat) || isNaN(lon) || isNaN(year)) {
      return NextResponse.json(
        { error: 'Invalid parameter values. lat and lon must be numbers, year must be an integer.' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.' },
        { status: 400 }
      );
    }

    if (year < 2017 || year > 2024) {
      return NextResponse.json(
        { error: 'Invalid year. Year must be between 2017 and 2024.' },
        { status: 400 }
      );
    }

    // Find the file containing this location
    const fileInfo = findFileForLocation(lat, lon, year);
    
    if (!fileInfo) {
      return NextResponse.json(
        { 
          error: 'No data available for this location and year.',
          details: 'This location may be in the ocean, a polar region, or outside the dataset coverage area.'
        },
        { status: 404 }
      );
    }

    // Convert lat/lon to UTM coordinates using proj4
    const utmCoords = latLonToUTM(lat, lon, fileInfo.crs);
    
    // Calculate pixel coordinates within the 8192x8192 image
    const pixelX = Math.floor(
      ((utmCoords.x - fileInfo.utmBounds.west) / (fileInfo.utmBounds.east - fileInfo.utmBounds.west)) * 8192
    );
    const pixelY = Math.floor(
      ((fileInfo.utmBounds.north - utmCoords.y) / (fileInfo.utmBounds.north - fileInfo.utmBounds.south)) * 8192
    );

    // Validate pixel coordinates are within bounds
    if (pixelX < 0 || pixelX >= 8192 || pixelY < 0 || pixelY >= 8192) {
      return NextResponse.json(
        { 
          error: 'Calculated pixel coordinates are out of bounds.',
          details: `Pixel coordinates: (${pixelX}, ${pixelY}). Expected range: 0-8191.`
        },
        { status: 400 }
      );
    }

    // Generate signed URL for the GCS file with userProject parameter
    const gcsPath = fileInfo.path.replace('gs://', '');
    const [bucketName, ...filePathParts] = gcsPath.split('/');
    const filePath = filePathParts.join('/');
    
    const [signedUrl] = await storage
      .bucket(bucketName)
      .file(filePath)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        extensionHeaders: {
          'x-goog-user-project': GCP_PROJECT_ID,
        },
      });

    // Read the GeoTIFF using the signed URL
    const tiff = await fromUrl(signedUrl);
    const image = await tiff.getImage();
    
    // Read a 1x1 window for the exact pixel
    const window = [pixelX, pixelY, pixelX + 1, pixelY + 1];
    const rasters = await image.readRasters({ window });
    
    // Extract the 64-channel embedding and dequantize
    const embedding: (number | null)[] = [];
    for (let channel = 0; channel < 64; channel++) {
      // Type assertion: rasters is an array of TypedArrays, each representing a channel
      const channelData = rasters[channel] as Int8Array;
      const rawValue = channelData[0];
      embedding.push(dequantize(rawValue));
    }

    // Check if the pixel is masked (all null values indicate NoData)
    const hasMaskedData = embedding.every(val => val === null);

    return NextResponse.json({
      success: true,
      location: { lat, lon, year },
      utmCoordinates: utmCoords,
      pixelCoordinates: { x: pixelX, y: pixelY },
      fileInfo: {
        gcsPath: fileInfo.path,
        utmZone: fileInfo.utmZone,
        crs: fileInfo.crs,
        bounds: fileInfo.bounds,
      },
      embedding,
      embeddingDimensions: 64,
      masked: hasMaskedData,
      attribution: 'The AlphaEarth Foundations Satellite Embedding dataset is produced by Google and Google DeepMind.',
      license: 'CC-BY 4.0',
    });

  } catch (error) {
    console.error('Error fetching embeddings:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Internal server error';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorDetails.includes('index file not found')) {
      errorMessage = 'AlphaEarth index file not found';
      errorDetails = 'Please run the setup script: node download_index.js';
    } else if (errorDetails.includes('ENOENT') && errorDetails.includes('gcp_credentials')) {
      errorMessage = 'GCP credentials file not found';
      errorDetails = 'Please configure your GCP service account credentials. See EMBEDDINGS_INTEGRATION_README.md for setup instructions.';
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
