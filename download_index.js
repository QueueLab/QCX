/**
 * AlphaEarth Embeddings Index Downloader
 * 
 * This script downloads the aef_index.csv file from Google Cloud Storage.
 * The index file maps geographical coordinates to specific embedding data files.
 * 
 * Prerequisites:
 * 1. A GCP service account with the following roles:
 *    - Storage Object Viewer
 *    - Service Usage Consumer
 * 2. Service account credentials JSON file
 * 3. A GCP project with billing enabled (for requester-pays bucket)
 * 
 * Usage:
 *   node download_index.js
 * 
 * Environment Variables:
 *   GCP_PROJECT_ID - Your Google Cloud Project ID (required)
 *   GCP_CREDENTIALS_PATH - Path to your service account JSON file (required)
 */

const { Storage } = require("@google-cloud/storage");
const path = require("path");
const fs = require("fs");

// Load environment variables from .env.local if it exists
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Configuration
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_CREDENTIALS_PATH = process.env.GCP_CREDENTIALS_PATH;

if (!GCP_PROJECT_ID) {
  console.error('Error: GCP_PROJECT_ID environment variable is not set.');
  console.error('Please set it in .env.local or export it in your shell.');
  console.error('Example: export GCP_PROJECT_ID=your-project-id');
  process.exit(1);
}

if (!GCP_CREDENTIALS_PATH) {
  console.error('Error: GCP_CREDENTIALS_PATH environment variable is not set.');
  console.error('Please set it in .env.local or export it in your shell.');
  console.error('Example: export GCP_CREDENTIALS_PATH=/path/to/credentials.json');
  process.exit(1);
}

if (!fs.existsSync(GCP_CREDENTIALS_PATH)) {
  console.error(`Error: Credentials file not found at ${GCP_CREDENTIALS_PATH}`);
  console.error('Please ensure your GCP service account credentials JSON file exists at this path.');
  process.exit(1);
}

async function downloadFile() {
  console.log('AlphaEarth Embeddings Index Downloader');
  console.log('======================================\n');
  console.log(`Project ID: ${GCP_PROJECT_ID}`);
  console.log(`Credentials: ${GCP_CREDENTIALS_PATH}`);
  console.log('');

  const storage = new Storage({
    keyFilename: GCP_CREDENTIALS_PATH,
    projectId: GCP_PROJECT_ID,
  });

  const bucketName = "alphaearth_foundations";
  const srcFilename = "satellite_embedding/v1/annual/aef_index.csv";
  const destFilename = path.join(__dirname, "aef_index.csv");

  console.log(`Downloading from gs://${bucketName}/${srcFilename}...`);
  console.log(`Destination: ${destFilename}`);
  console.log('');
  console.log('Note: This is a "requester pays" bucket. Download costs will be billed to your GCP project.');
  console.log('Expected file size: ~13.5 MB');
  console.log('');

  const options = {
    destination: destFilename,
    userProject: GCP_PROJECT_ID,
  };

  try {
    await storage.bucket(bucketName).file(srcFilename).download(options);
    
    const stats = fs.statSync(destFilename);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log('✓ Download complete!');
    console.log(`✓ File size: ${fileSizeMB} MB`);
    console.log(`✓ Location: ${destFilename}`);
    console.log('');
    console.log('You can now use the /api/embeddings endpoint.');
  } catch (error) {
    console.error('✗ Download failed!');
    console.error('');
    
    if (error.code === 401 || error.code === 403) {
      console.error('Authentication/Authorization Error:');
      console.error('- Ensure your service account has the "Storage Object Viewer" role');
      console.error('- Ensure your service account has the "Service Usage Consumer" role');
      console.error('- Verify that your credentials file is valid and not expired');
    } else if (error.message && error.message.includes('requester pays')) {
      console.error('Requester Pays Error:');
      console.error('- Ensure your GCP project has billing enabled');
      console.error('- Verify that the GCP_PROJECT_ID is correct');
    } else {
      console.error('Error details:', error.message);
    }
    
    process.exit(1);
  }
}

downloadFile().catch(console.error);
