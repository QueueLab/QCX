import crypto from 'crypto';
import { encrypt, decrypt } from '../lib/utils/encryption';

console.log("Starting encryption tests...");

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'my-super-secret-key-32-chars-long-or-more';

// Test basic GCM encrypt/decrypt
const originalText = "Hello, GCM authenticated encryption!";
const encrypted = encrypt(originalText);

if (!encrypted) {
  throw new Error("Encryption failed: returned null");
}

console.log("Encrypted GCM Text:", encrypted);

const parts = encrypted.split(':');
if (parts.length !== 3) {
  throw new Error(`Encrypted text does not have 3 parts separated by colons. Got: ${parts.length}`);
}

const decrypted = decrypt(encrypted);
if (decrypted !== originalText) {
  throw new Error(`GCM Decryption failed! Expected: "${originalText}", got: "${decrypted}"`);
}
console.log("GCM Decryption verified successfully!");

// Test legacy CBC decryption backwards compatibility
const legacyText = "Hello, legacy CBC encryption!";
const ivCbc = crypto.randomBytes(16);
const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
const cipherCbc = crypto.createCipheriv('aes-256-cbc', key, ivCbc);
let encryptedCbc = cipherCbc.update(legacyText, 'utf8', 'hex');
encryptedCbc += cipherCbc.final('hex');
const legacyPayload = `${ivCbc.toString('hex')}:${encryptedCbc}`;

console.log("Legacy CBC payload:", legacyPayload);
const decryptedLegacy = decrypt(legacyPayload);
if (decryptedLegacy !== legacyText) {
  throw new Error(`Legacy CBC Decryption failed! Expected: "${legacyText}", got: "${decryptedLegacy}"`);
}
console.log("Legacy CBC Decryption backwards compatibility verified successfully!");

// Test integrity protection (GCM authentication tag verification)
// Modify one byte of the ciphertext
const [iv, ciphertext, tag] = parts;
const modifiedCiphertext = ciphertext.substring(0, ciphertext.length - 2) + (ciphertext.endsWith('0') ? '1' : '0');
const modifiedEncrypted = `${iv}:${modifiedCiphertext}:${tag}`;

// Decrypting tampered or invalid hex string might log an error and return null.
// We disable console.error temporarily to keep the test logs clean.
const originalConsoleError = console.error;
console.error = () => {};
try {
  const decryptedModified = decrypt(modifiedEncrypted);
  if (decryptedModified !== null) {
    throw new Error("Decryption of modified ciphertext did not return null! GCM authentication tag failed to catch tamper.");
  }
} finally {
  console.error = originalConsoleError;
}
console.log("GCM Authentication tag verification passed!");

// Test null/undefined handling
if (encrypt(null) !== null || encrypt(undefined) !== null) {
  throw new Error("encrypt(null/undefined) did not return null");
}
if (decrypt(null) !== null || decrypt(undefined) !== null) {
  throw new Error("decrypt(null/undefined) did not return null");
}
console.log("Null/undefined handling passed!");

console.log("All encryption tests passed!");
