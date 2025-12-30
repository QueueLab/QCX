# AlphaEarth Satellite Embeddings Integration for QCX

This document provides a complete guide to the implementation that fetches AlphaEarth satellite embeddings from Google Cloud Storage (GCS) and integrates them into the QCX application.

## 1. Overview

A new API endpoint has been created at `/api/embeddings` within the QCX Next.js application. This endpoint allows you to retrieve a 64-dimensional satellite embedding vector for any given latitude, longitude, and year (from 2017 to 2024).

The implementation leverages Google's AlphaEarth Foundations dataset, which is stored in a public but "requester pays" GCS bucket. The solution is designed to be efficient and cost-effective by only fetching the precise pixels needed for each request.

## 2. One-Time Setup

Before using the API, two one-time setup steps are required.

### Step 2.1: Google Cloud Service Account

To authenticate with the "requester pays" GCS bucket, a service account with specific permissions is necessary. If you have not done so already, follow these steps:

1.  **Navigate to the IAM & Admin section** of your Google Cloud Console.
2.  **Create a new Service Account**. You can name it something descriptive, like `qcx-alphaearth-reader`.
3.  **Grant the following two roles** to the service account:
    *   `Storage Object Viewer`: Allows the service account to read files from GCS.
    *   `Service Usage Consumer`: Allows the service account to bill the requests to your project.
4.  **Create a JSON key** for the service account and download it.
5.  **Place the downloaded JSON key file** in the root directory of the `QCX` project and rename it to `gcp_credentials.json`.

### Step 2.2: Download the Index File

The integration relies on a CSV index file to quickly locate the correct data file for a given coordinate. This file needs to be downloaded once.

1.  A script at `download_index.js` has been created to facilitate this.
2.  Run the following command from the root of the `QCX` project directory:

```bash
node download_index.js
```

This will download `aef_index.csv` (approx. 13.5 MB) into the project's root directory. The API is configured to read from this location.

## 3. API Usage

The new endpoint is easy to use. Simply make a `GET` request to `/api/embeddings` with the required query parameters.

**Endpoint**: `/api/embeddings`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type    | Required | Description                                       |
| :-------- | :------ | :------- | :------------------------------------------------ |
| `lat`     | Number  | Yes      | The latitude, between -90 and 90.                 |
| `lon`     | Number  | Yes      | The longitude, between -180 and 180.              |
| `year`    | Integer | Yes      | The year for the embedding, between 2017 and 2024. |

**Example Request**:

```
/api/embeddings?lat=40.7128&lon=-74.0060&year=2023
```

**Example Success Response**:

```json
{
  "success": true,
  "location": {
    "lat": 40.7128,
    "lon": -74.0060,
    "year": 2023
  },
  "utmCoordinates": { ... },
  "pixelCoordinates": { ... },
  "fileInfo": { ... },
  "embedding": [
    0.012345,
    -0.056789,
    // ... 62 more values
  ],
  "embeddingDimensions": 64,
  "masked": false,
  "attribution": "The AlphaEarth Foundations Satellite Embedding dataset is produced by Google and Google DeepMind."
}
```

## 4. Code Implementation

The core logic is contained in the new API route file:

**File**: `app/api/embeddings/route.ts`

The script performs the following actions on each request:

1.  **Loads the Index**: It reads the `aef_index.csv` file into memory on the first request and caches it for subsequent calls.
2.  **Finds the File**: It iterates through the index to find the specific Cloud Optimized GeoTIFF (COG) file that contains the data for the requested coordinates and year.
3.  **Coordinate Transformation**: It uses the `proj4` library to accurately convert the WGS84 latitude/longitude coordinates into the correct UTM (Universal Transverse Mercator) projection used by the COG file.
4.  **Pixel Calculation**: It calculates the exact `(x, y)` pixel coordinates within the 8192x8192 COG file that correspond to the UTM coordinates.
5.  **Secure URL Generation**: It generates a temporary, signed URL to access the COG file from GCS. This is a secure method that grants short-lived access without exposing credentials.
6.  **Targeted Data Fetching**: It uses the `geotiff` library to read data from the signed URL. Crucially, it performs a highly efficient **range request** to fetch only the single pixel (and its 64 channels) needed, not the entire multi-megabyte file.
7.  **Dequantization**: It applies the required mathematical formula to convert the raw 8-bit integer values from the file into the final floating-point embedding values between -1 and 1.
8.  **JSON Response**: It returns a comprehensive JSON object containing the location, file information, and the final 64-dimensional embedding vector.

## 5. New Dependencies

The following npm packages were added to `package.json` to support this functionality:

-   `@google-cloud/storage`: The official Google Cloud Storage client library for Node.js.
-   `csv-parse`: A robust library for parsing the CSV index file.
-   `geotiff`: A powerful library for reading and parsing GeoTIFF files, including Cloud Optimized GeoTIFFs (COGs).
-   `proj4`: A standard library for performing cartographic projections and coordinate transformations.

## 6. Cost Considerations

The cost of using this API is designed to be minimal:

-   **One-Time Cost**: The initial download of the `aef_index.csv` file (approx. 13.5 MB) will incur a very small, one-time egress charge from Google Cloud Storage (typically less than a cent).
-   **Per-Request Cost**: Each API call results in a `GET` request for a few hundred bytes from a GCS file. The cost for this is negligible, usually a tiny fraction of a cent. You can perform thousands of requests for less than a dollar.

By fetching only the required pixels, this implementation avoids the high costs associated with downloading the full, large COG files for every request.
