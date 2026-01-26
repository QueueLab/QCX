# AlphaEarth Embeddings API - Setup Guide

This guide will help you set up and configure the AlphaEarth embeddings API in QCX.

## Overview

The AlphaEarth embeddings API provides access to Google's AlphaEarth Foundations satellite embeddings dataset. Each embedding is a 64-dimensional vector that represents a full year of multi-sensor satellite observations for a 10×10 meter area on Earth.

## Prerequisites

1. **Google Cloud Platform Account** with billing enabled
2. **Node.js** (version 20 or higher)
3. **Bun** package manager (already configured in QCX)

## Step 1: Install Dependencies

The required packages have already been added to `package.json`:

```bash
bun install
```

This will install:
- `@google-cloud/storage` - GCP Storage client
- `csv-parse` - CSV parsing library
- `geotiff` - GeoTIFF reading library
- `proj4` - Coordinate transformation library

## Step 2: Create a Google Cloud Service Account

1. Go to the [Service Accounts page](https://console.cloud.google.com/iam-admin/serviceaccounts) in Google Cloud Console
2. Select your project
3. Click **"+ CREATE SERVICE ACCOUNT"**
4. Enter a name (e.g., `qcx-alphaearth-reader`)
5. Click **"CREATE AND CONTINUE"**
6. Add these two roles:
   - **Storage Object Viewer**
   - **Service Usage Consumer**
7. Click **"CONTINUE"**, then **"DONE"**
8. Click the three-dot menu → **"Manage keys"**
9. Click **"ADD KEY"** → **"Create new key"**
10. Select **"JSON"** and click **"CREATE"**
11. Save the downloaded JSON file securely

## Step 3: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.embeddings.example .env.local
```

2. Edit `.env.local` and fill in your values:

```env
GCP_PROJECT_ID=your-project-id-here
GCP_CREDENTIALS_PATH=/path/to/your/gcp_credentials.json
```

**Security Note**: Never commit `.env.local` or `gcp_credentials.json` to version control. These files are already in `.gitignore`.

## Step 4: Download the Index File

Run the download script to fetch the AlphaEarth index file (~13.5 MB):

```bash
node download_index.js
```

This will download `aef_index.csv` to the project root. This is a one-time operation.

**Note**: The download incurs a small cost (< $0.01) as the bucket is "requester pays".

## Step 5: Test the API

Start the development server:

```bash
bun run dev
```

Test the API with a sample request:

```bash
curl "http://localhost:3000/api/embeddings?lat=40.7128&lon=-74.0060&year=2023"
```

You should receive a JSON response with a 64-dimensional embedding vector.

## API Usage

### Endpoint

```
GET /api/embeddings
```

### Query Parameters

| Parameter | Type    | Required | Description |
|:----------|:--------|:---------|:------------|
| `lat`     | Number  | Yes      | Latitude (-90 to 90) |
| `lon`     | Number  | Yes      | Longitude (-180 to 180) |
| `year`    | Integer | Yes      | Year (2017 to 2024) |

### Example Response

```json
{
  "success": true,
  "location": {
    "lat": 40.7128,
    "lon": -74.0060,
    "year": 2023
  },
  "embedding": [0.012, -0.056, ...], // 64 values
  "embeddingDimensions": 64,
  "masked": false,
  "attribution": "The AlphaEarth Foundations Satellite Embedding dataset is produced by Google and Google DeepMind.",
  "license": "CC-BY 4.0"
}
```

## Cost Considerations

- **One-time**: Index file download (~$0.01)
- **Per request**: ~$0.00000006 (approximately 16.7 million requests per $1)

The API is highly optimized to fetch only the specific pixels needed, minimizing costs.

## Troubleshooting

### "Index file not found"

Run `node download_index.js` to download the index file.

### "GCP credentials file not found"

Ensure `GCP_CREDENTIALS_PATH` in `.env.local` points to your service account JSON file.

### "Permission denied" (403)

Verify your service account has both required roles:
- Storage Object Viewer
- Service Usage Consumer

### "No data available for this location"

The requested coordinates may be in the ocean, a polar region, or outside the dataset coverage area.

## Production Deployment

For production:

1. Store credentials securely using environment variables or secrets management
2. Consider implementing caching for frequently requested embeddings
3. Monitor GCS costs in your Google Cloud Console
4. Review and adjust the signed URL expiration time if needed

## Additional Resources

- [AlphaEarth Foundations Blog Post](https://deepmind.google/blog/alphaearth-foundations-helps-map-our-planet-in-unprecedented-detail/)
- [Dataset Documentation](https://developers.google.com/earth-engine/guides/aef_on_gcs_readme)
- [Earth Engine Tutorials](https://developers.google.com/earth-engine/tutorials/community/satellite-embedding-01-introduction)

## Support

For issues or questions, please open an issue in the QCX repository.
