import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { signToken } from '@/lib/jwt';
import { getSession, COOKIE, cookieOptions } from '@/lib/auth';
import { runSeed } from '@/lib/seed';

// ─── POST /api/auth/register ──────────────────────────────
export async function POST(req: Request) {
  await runSeed();
  const { nombre, documento, tipoDoc, telefono, email, password, regimen } = await req.json();

  if (!nombre || !documento || !tipoDoc || !telefono) {
    return NextResponse.json({ error: 'Nombre, documento, tipo y teléfono son obligatorios.' }, { status: 400 });
  }
  // Si no viene contraseña (nuevo flujo), usamos el documento como contraseña inicial
  const finalPassword = (password && password.length >= 6) ? password : documento;
  if (finalPassword.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener mínimo 6 caracteres.' }, { status: 400 });
  }

  // Email es opcional ahora; verificamos si el documento ya existe
  const existing = await db.prepare('SELECT id FROM usuarios WHERE documento = ?' + (email ? ' OR email = ?' : ''))
    .get(...([documento.trim(), ...(email ? [email.toLowerCase().trim()] : [])] as [string, ...string[]]));
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese documento o correo.' }, { status: 409 });
  }

  const finalEmail = email ? email.toLowerCase().trim() : `${documento.trim()}@itagui.local`;

  const result = await db.prepare(
    `INSERT INTO usuarios (nombre, documento, tipo_doc, telefono, email, password, regimen)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(nombre.trim(), documento.trim(), tipoDoc, telefono.trim(),
        finalEmail, hashPassword(finalPassword), regimen ?? null);

  const user = await db.prepare(
    'SELECT id, nombre, email, rol, documento, tipo_doc, telefono, regimen FROM usuarios WHERE id = ?'
  ).get(result.lastInsertRowid) as Record<string, unknown>;

  const token = signToken({ id: user.id as number, rol: user.rol as string, nombre: user.nombre as string });

  const res = NextResponse.json({ user }, { status: 201 });
  res.cookies.set(COOKIE, token, cookieOptions());
  return res;
}
