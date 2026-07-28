import { NextResponse } from 'next/server';
import { COOKIE } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ message: 'Sesión cerrada.' });
  res.cookies.set(COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
