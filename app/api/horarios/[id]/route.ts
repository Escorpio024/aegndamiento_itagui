import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }
  const { id } = await params;
  const cita = await db.prepare('SELECT id FROM citas WHERE horario_id=?').get(id);
  if (cita) return NextResponse.json({ error: 'No se puede eliminar un horario con cita.' }, { status: 409 });
  await db.prepare('DELETE FROM horarios WHERE id=?').run(id);
  return NextResponse.json({ message: 'Horario eliminado.' });
}
