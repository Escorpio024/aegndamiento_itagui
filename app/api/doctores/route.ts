import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession, requireAdmin } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === 'true' && session?.rol === 'admin';

  const rows = db.prepare(
    all ? 'SELECT * FROM doctores ORDER BY nombre'
        : 'SELECT * FROM doctores WHERE activo=1 ORDER BY nombre'
  ).all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }
  const { nombre, especialidad } = await req.json();
  if (!nombre) return NextResponse.json({ error: 'Nombre requerido.' }, { status: 400 });

  const result = db.prepare('INSERT INTO doctores (nombre, especialidad) VALUES (?, ?)')
    .run(nombre.trim(), especialidad ?? 'Radiología');
  return NextResponse.json(db.prepare('SELECT * FROM doctores WHERE id=?').get(result.lastInsertRowid), { status: 201 });
}
