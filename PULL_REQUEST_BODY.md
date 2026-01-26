## Feature: AlphaEarth Satellite Embeddings API

This pull request introduces a new API endpoint (`/api/embeddings`) to fetch AlphaEarth satellite embeddings from Google Cloud Storage. This enables powerful geospatial analysis by providing 64-dimensional embedding vectors for any given location and year.

### Summary of Changes

- **New API Route**: Created `/app/api/embeddings/route.ts` to handle embedding requests.
- **GCP Integration**: Uses the `@google-cloud/storage` library to securely access the "requester pays" GCS bucket.
- **Efficient Data Fetching**: Leverages Cloud Optimized GeoTIFFs (COGs) and the `geotiff` library to perform range requests, fetching only the specific pixels needed (~500 bytes per request).
- **Accurate Coordinate Transformation**: Uses `proj4` for precise WGS84 to UTM coordinate conversion.
- **Setup Script**: Added `download_index.js` to download the required `aef_index.csv` file.
- **Configuration**: Uses environment variables for GCP configuration (`.env.local`). An example file (`.env.embeddings.example`) is provided.
- **Documentation**: Added a comprehensive setup guide at `docs/ALPHAEARTH_SETUP.md`.
- **Dependencies**: Added `@google-cloud/storage`, `csv-parse`, `geotiff`, and `proj4` to `package.json`.
- **Gitignore**: Updated `.gitignore` to exclude sensitive credentials and the large index file.

### How to Set Up and Test

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Configure environment variables**:
   - Copy `.env.embeddings.example` to `.env.local`.
   - Fill in your `GCP_PROJECT_ID` and `GCP_CREDENTIALS_PATH`.

3. **Download the index file**:
   ```bash
   node download_index.js
   ```

4. **Run the development server**:
   ```bash
   bun run dev
   ```

5. **Test the API**:
   ```bash
   curl "http://localhost:3000/api/embeddings?lat=40.7128&lon=-74.0060&year=2023"
   ```

### Key Features

- **Cost-Effective**: Minimizes GCS egress costs by fetching only required pixels.
- **Secure**: Uses service account credentials and signed URLs.
- **Accurate**: Precise coordinate transformations with `proj4`.
- **Well-Documented**: Includes a detailed setup guide and code comments.
- **Production-Ready**: Supports environment variables for configuration.

### Next Steps

- Review the implementation and documentation.
- Merge the pull request.
- Consider implementing a caching layer for frequently requested embeddings to further optimize performance and cost.

This implementation provides a robust and scalable foundation for integrating powerful geospatial AI capabilities into the QCX platform.
