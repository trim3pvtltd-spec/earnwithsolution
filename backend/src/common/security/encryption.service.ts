import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Handles AES-256-GCM encryption for sensitive data at rest:
 * Aadhaar number, PAN number, Bank account number, IFSC.
 *
 * Encrypted values are stored as "iv:authTag:cipherText" (hex).
 * A separate SHA-256 hash is stored alongside for fast duplicate
 * lookups (Aadhaar/PAN) WITHOUT ever decrypting the value.
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const hexKey = process.env.AES_ENCRYPTION_KEY;
    if (!hexKey || hexKey.length !== 64) {
      throw new Error(
        'AES_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32',
      );
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(payload: string): string {
    const [ivHex, authTagHex, dataHex] = payload.split(':');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  /** One-way hash for duplicate detection (Aadhaar/PAN) without decrypting anything. */
  hashForLookup(value: string): string {
    return crypto.createHash('sha256').update(value.trim().toUpperCase()).digest('hex');
  }

  /** Mask sensitive numbers for UI display, e.g. PAN -> XXXXX1234F */
  mask(value: string, visibleTail = 4): string {
    if (value.length <= visibleTail) return value;
    return 'X'.repeat(value.length - visibleTail) + value.slice(-visibleTail);
  }
}
