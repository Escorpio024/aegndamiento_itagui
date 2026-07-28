import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyPassword } from '@/lib/crypto';
import { signToken } from '@/lib/jwt';
import { COOKIE, cookieOptions } from '@/lib/auth';
import { runSeed } from '@/lib/seed';

let seeded = false;
function ensureSeeded() { if (!seeded) { runSeed(); seeded = true; } }

// ─── POST /api/auth/login ──────────────────────────────────────────
export async function POST(req: Request) {
  ensureSeeded();
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Correo y contraseña requeridos.' }, { status: 400 });
  }

  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?')
    .get(email.toLowerCase().trim()) as Record<string, unknown> | undefined;

  if (!user || !verifyPassword(password, user.password as string)) {
    return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
  }

  const token = signToken({ id: user.id as number, rol: user.rol as string, nombre: user.nombre as string });
  const { password: _, ...safeUser } = user;

  const res = NextResponse.json({ user: safeUser });
  res.cookies.set(COOKIE, token, cookieOptions());
  return res;
}
