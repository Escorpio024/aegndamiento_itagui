import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, signToken } from '@/lib/jwt';
import { cookieOptions, COOKIE } from '@/lib/auth';

/**
 * GET /api/auth/refresh
 * Renueva el token JWT si está activo y le quedan menos de 2 horas.
 * El middleware lo llama automáticamente en cada request a rutas protegidas.
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  try {
    const payload = verifyToken(token);
    const now = Math.floor(Date.now() / 1000);
    const remaining = (payload.exp ?? 0) - now;

    // Solo renovar si quedan menos de 2 horas (7200s) — evita renovaciones innecesarias
    if (remaining > 7200) {
      return NextResponse.json({ ok: true, refreshed: false });
    }

    const newToken = signToken({ id: payload.id, rol: payload.rol, nombre: payload.nombre });
    const res = NextResponse.json({ ok: true, refreshed: true });
    res.cookies.set(COOKIE, newToken, cookieOptions());
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
}
