import sharp from 'sharp';

/**
 * Extracts a region from a base64 image and returns it as a base64 data URL.
 * @param base64Image The source image in base64 format (with or without data prefix).
 * @param region Normalized coordinates (0-1) for the crop: { x, y, width, height }.
 * @param targetSize The maximum dimension for the output image (default 1024).
 */
export async function extractRegion(
  base64Image: string,
  region: { x: number; y: number; width: number; height: number },
  targetSize = 1024
): Promise<{ dataUrl: string; mimeType: string }> {
  // Remove data prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const image = sharp(buffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image metadata');
  }

  // Convert normalized coordinates to pixel coordinates
  const left = Math.round(region.x * metadata.width);
  const top = Math.round(region.y * metadata.height);
  const width = Math.round(region.width * metadata.width);
  const height = Math.round(region.height * metadata.height);

  // Ensure we are within bounds and have non-zero dimensions
  const safeLeft = Math.max(0, Math.min(left, metadata.width - 1));
  const safeTop = Math.max(0, Math.min(top, metadata.height - 1));
  const safeWidth = Math.max(1, Math.min(width, metadata.width - safeLeft));
  const safeHeight = Math.max(1, Math.min(height, metadata.height - safeTop));

  // Extract and resize
  const croppedBuffer = await image
    .extract({ left: safeLeft, top: safeTop, width: safeWidth, height: safeHeight })
    .resize(targetSize, targetSize, {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .jpeg({ quality: 85 })
    .toBuffer();

  const mimeType = 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${croppedBuffer.toString('base64')}`;

  return { dataUrl, mimeType };
}
