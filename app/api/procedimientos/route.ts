import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { runSeed } from '@/lib/seed';

export async function GET() {
  runSeed();
  const rows = db.prepare('SELECT * FROM procedimientos WHERE activo=1 ORDER BY nombre').all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }
  const { cups, nombre, modalidad, contraste } = await req.json();
  if (!cups || !nombre) return NextResponse.json({ error: 'CUPS y nombre son obligatorios.' }, { status: 400 });
  const r = db.prepare('INSERT INTO procedimientos (cups, nombre, modalidad, contraste) VALUES (?,?,?,?)')
    .run(cups, nombre, modalidad ?? 'IMAGENES_DIAGNOSTICAS', contraste ?? 'Simple');
  return NextResponse.json(db.prepare('SELECT * FROM procedimientos WHERE id=?').get(r.lastInsertRowid), { status: 201 });
}
