import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { signToken } from '@/lib/jwt';
import { getSession, COOKIE, cookieOptions } from '@/lib/auth';
import { runSeed } from '@/lib/seed';

// Seed automático al primer uso
let seeded = false;
function ensureSeeded() { if (!seeded) { runSeed(); seeded = true; } }

// ─── POST /api/auth/register ──────────────────────────────
export async function POST(req: Request) {
  ensureSeeded();
  const { nombre, documento, tipoDoc, telefono, email, password, regimen } = await req.json();

  if (!nombre || !documento || !tipoDoc || !telefono || !email || !password) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener mínimo 6 caracteres.' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM usuarios WHERE email = ? OR documento = ?')
    .get(email.toLowerCase().trim(), documento.trim());
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese correo o documento.' }, { status: 409 });
  }

  const result = db.prepare(
    `INSERT INTO usuarios (nombre, documento, tipo_doc, telefono, email, password, regimen)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(nombre.trim(), documento.trim(), tipoDoc, telefono.trim(),
        email.toLowerCase().trim(), hashPassword(password), regimen ?? null);

  const user = db.prepare(
    'SELECT id, nombre, email, rol, documento, tipo_doc, telefono, regimen FROM usuarios WHERE id = ?'
  ).get(result.lastInsertRowid) as Record<string, unknown>;

  const token = signToken({ id: user.id as number, rol: user.rol as string, nombre: user.nombre as string });

  const res = NextResponse.json({ user }, { status: 201 });
  res.cookies.set(COOKIE, token, cookieOptions());
  return res;
}
