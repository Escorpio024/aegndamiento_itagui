import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession, requireAdmin } from '@/lib/auth';
import { runSeed } from '@/lib/seed';

// GET /api/sedes — públicas activas (o todas si admin)
export async function GET(req: Request) {
  runSeed();
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === 'true' && session?.rol === 'admin';

  const sedes = db.prepare(
    all ? 'SELECT * FROM sedes ORDER BY nombre'
        : 'SELECT * FROM sedes WHERE activa = 1 ORDER BY nombre'
  ).all();
  return NextResponse.json(sedes);
}

// POST /api/sedes — solo admin
export async function POST(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }

  const { nombre, direccion, ciudad, telefono } = await req.json();
  if (!nombre || !direccion) return NextResponse.json({ error: 'Nombre y dirección requeridos.' }, { status: 400 });

  const result = db.prepare('INSERT INTO sedes (nombre, direccion, ciudad, telefono) VALUES (?, ?, ?, ?)')
    .run(nombre.trim(), direccion.trim(), ciudad ?? 'Itagüi', telefono ?? null);

  const sede = db.prepare('SELECT * FROM sedes WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(sede, { status: 201 });
}
