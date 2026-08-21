import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/crypto';
import { signToken } from '@/lib/jwt';
import { COOKIE, cookieOptions } from '@/lib/auth';
import { runSeed } from '@/lib/seed';

// ─── GET /api/auth/login?documento=xxx — verifica si el documento necesita contraseña
export async function GET(req: Request) {
  await runSeed();
  const { searchParams } = new URL(req.url);
  const documento = searchParams.get('documento')?.trim() ?? '';
  if (!documento) return NextResponse.json({ needsPassword: false });

  // Si existe en usuarios y su contraseña NO es la cédula hasheada → necesita contraseña
  const user = await db.prepare('SELECT password, rol FROM usuarios WHERE documento = ?')
    .get(documento) as Record<string, unknown> | null;

  if (user) {
    // Si el rol es admin siempre pide contraseña; si es paciente y no cambió su pass, no la pide
    const needsPassword = user.rol === 'admin' || !verifyPassword(documento, user.password as string);
    return NextResponse.json({ needsPassword, rol: user.rol });
  }

  // No existe en usuarios → buscar en demanda_inducida (login con cédula como contraseña)
  const enDemanda = await db.prepare(
    'SELECT 1 FROM demanda_inducida WHERE numero_identificacion = ? LIMIT 1'
  ).get(documento);

  return NextResponse.json({ needsPassword: false, enDemanda: !!enDemanda });
}

// ─── POST /api/auth/login ─────────────────────────────────────────────
export async function POST(req: Request) {
  await runSeed();
  const { documento, password } = await req.json();
  if (!documento || !password) {
    return NextResponse.json({ error: 'Cédula y contraseña son requeridas.' }, { status: 400 });
  }

  const docTrimmed = documento.trim();

  // 1. Buscar en la tabla de usuarios registrados
  let user = await db.prepare('SELECT * FROM usuarios WHERE documento = ?')
    .get(docTrimmed) as Record<string, unknown> | null;

  // 2. Si NO existe en usuarios, verificar si está en demanda_inducida
  if (!user) {
    const paciente = await db.prepare(
      'SELECT nombres, apellidos, telefonos, numero_identificacion FROM demanda_inducida WHERE numero_identificacion = ? LIMIT 1'
    ).get(docTrimmed) as Record<string, unknown> | null;

    if (paciente) {
      // En primer acceso la contraseña debe ser la cédula
      if (password !== docTrimmed) {
        return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
      }
      // Auto-crear el usuario en la tabla usuarios
      const nombre = `${paciente.nombres || ''} ${paciente.apellidos || ''}`.trim() || `Paciente ${docTrimmed}`;
      const email  = `${docTrimmed}@itagui.local`;
      const result = await db.prepare(
        `INSERT INTO usuarios (nombre, documento, tipo_doc, telefono, email, password, rol)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(nombre, docTrimmed, 'CC', (paciente.telefonos as string) || '', email, hashPassword(docTrimmed), 'paciente');
      user = await db.prepare('SELECT * FROM usuarios WHERE id = ?')
        .get(result.lastInsertRowid) as Record<string, unknown>;
    }
  }

  // 3. Validar credenciales finales
  if (!user || !verifyPassword(password, user.password as string)) {
    return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
  }

  const token = signToken({ id: user.id as number, rol: user.rol as string, nombre: user.nombre as string });
  const { password: _, ...safeUser } = user;

  const res = NextResponse.json({ user: safeUser });
  res.cookies.set(COOKIE, token, cookieOptions());
  return res;
}
