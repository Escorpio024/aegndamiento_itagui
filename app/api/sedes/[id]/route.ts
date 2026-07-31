import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }
  const { id } = await params;
  const { nombre, direccion, ciudad, telefono, activa } = await req.json();

  await db.prepare('UPDATE sedes SET nombre=?, direccion=?, ciudad=?, telefono=?, activa=? WHERE id=?')
    .run(nombre, direccion, ciudad, telefono ?? null, activa ? 1 : 0, id);

  return NextResponse.json(await db.prepare('SELECT * FROM sedes WHERE id=?').get(id));
}

export async function DELETE(_req: Request, { params }: Params) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }
  const { id } = await params;
  await db.prepare('UPDATE sedes SET activa=0 WHERE id=?').run(id);
  return NextResponse.json({ message: 'Sede desactivada.' });
}
