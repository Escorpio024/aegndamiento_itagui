/**
 * lib/crypto.ts — PBKDF2 password hashing con crypto built-in
 */
import crypto from 'node:crypto';

const ITER = 310_000;
const LEN  = 64;
const DIG  = 'sha512';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const key  = crypto.pbkdf2Sync(password, salt, ITER, LEN, DIG).toString('hex');
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const key = crypto.pbkdf2Sync(password, salt, ITER, LEN, DIG).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
  } catch {
    return false;
  }
}
