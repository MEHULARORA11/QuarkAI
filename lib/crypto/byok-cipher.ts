import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // recommended IV length for GCM

/**
 * Reads and validates the server-only encryption secret. Must be a
 * base64-encoded 32-byte value, e.g. generated with:
 *   openssl rand -base64 32
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.BYOK_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("BYOK_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) {
    throw new Error("BYOK_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return key;
}

/**
 * Encrypts a plaintext OpenAI API key for storage in `User.openAiApiKey`.
 * Output format: `<iv>.<authTag>.<ciphertext>`, each segment base64-encoded.
 */
export function encryptApiKey(plainText: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/**
 * Decrypts a value previously produced by {@link encryptApiKey}.
 *
 * @throws {Error} When the stored value is malformed or the auth tag doesn't match.
 */
export function decryptApiKey(stored: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, dataB64] = stored.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted API key");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

  return decrypted.toString("utf8");
}
