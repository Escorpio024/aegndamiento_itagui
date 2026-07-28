/**
 * lib/jwt.ts — JWT con crypto built-in de Node.js
 */
import crypto from 'node:crypto';

const SECRET = process.env.JWT_SECRET ?? 'itagui-radiologia-2024-clave-ultra-segura';
const EXPIRES = 60 * 60 * 24; // 24h

export interface JwtPayload {
  id: number;
  rol: string;
  nombre: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + EXPIRES })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token inválido');
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  if (expected !== sig) throw new Error('Firma inválida');
  const data: JwtPayload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (data.exp! < Math.floor(Date.now() / 1000)) throw new Error('Token expirado');
  return data;
}
