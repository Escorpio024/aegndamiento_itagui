import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const user = await db.prepare(
    'SELECT id, nombre, email, rol, documento, tipo_doc, telefono, regimen, created_at FROM usuarios WHERE id = ?'
  ).get(session.id);

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
  return NextResponse.json(user);
}
