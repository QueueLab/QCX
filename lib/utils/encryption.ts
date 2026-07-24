import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set');
}
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;
  const iv = crypto.randomBytes(12); // Standard IV size for GCM is 12 bytes
  // Ensure the key is exactly 32 bytes
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${tag}`;
}

export function decrypt(encryptedText: string | null | undefined): string | null {
  if (!encryptedText) return null;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, encrypted, tagHex] = parts;
    if (!ivHex || !encrypted || !tagHex) return null;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error);
    return null;
  }
}
