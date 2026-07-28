import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }
  const { id } = await params;
  const { nombre, especialidad, activo } = await req.json();
  db.prepare('UPDATE doctores SET nombre=?, especialidad=?, activo=? WHERE id=?')
    .run(nombre, especialidad, activo ? 1 : 0, id);
  return NextResponse.json(db.prepare('SELECT * FROM doctores WHERE id=?').get(id));
}

export async function DELETE(_req: Request, { params }: Params) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }
  const { id } = await params;
  db.prepare('UPDATE doctores SET activo=0 WHERE id=?').run(id);
  return NextResponse.json({ message: 'Doctor desactivado.' });
}
