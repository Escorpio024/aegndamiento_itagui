/**
 * lib/auth.ts — Server-side auth helpers para Next.js App Router
 */
import { cookies } from 'next/headers';
import { verifyToken, type JwtPayload } from './jwt';

const COOKIE = 'radi_token';

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<JwtPayload> {
  const session = await getSession();
  if (!session) throw new Error('No autorizado');
  return session;
}

export async function requireAdmin(): Promise<JwtPayload> {
  const session = await requireSession();
  if (session.rol !== 'admin') throw new Error('Acceso denegado');
  return session;
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24, // 24h
    path: '/',
  };
}

export { COOKIE };
