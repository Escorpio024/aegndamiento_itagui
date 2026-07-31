import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }
  const { id } = await params;
  const { nombre, cups, modalidad, contraste, activo } = await req.json();
  await db.prepare('UPDATE procedimientos SET nombre=?, cups=?, modalidad=?, contraste=?, activo=? WHERE id=?')
    .run(nombre, cups, modalidad, contraste, activo ? 1 : 0, id);
  return NextResponse.json(await db.prepare('SELECT * FROM procedimientos WHERE id=?').get(id));
}

export async function PATCH(req: Request, { params }: Params) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }
  const { id } = await params;
  const proc = await db.prepare('SELECT * FROM procedimientos WHERE id=?').get(id) as any;
  if (!proc) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
  await db.prepare('UPDATE procedimientos SET activo=? WHERE id=?').run(proc.activo ? 0 : 1, id);
  return NextResponse.json({ activo: !proc.activo });
}
