import { createHash, randomBytes } from 'crypto';

export function generateSecureToken(): string {
  return randomBytes(64).toString('hex');
}

export function sha256Hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
