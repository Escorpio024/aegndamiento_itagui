import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession, requireAdmin } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/citas/[id] — cancelar (paciente) o cambiar estado (admin)
export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { id } = await params;
  const { estado } = await req.json();
  const cita = await db.prepare('SELECT * FROM citas WHERE id=?').get(id) as any;
  if (!cita) return NextResponse.json({ error: 'Cita no encontrada.' }, { status: 404 });

  if (session.rol === 'admin') {
    const validos = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA'];
    if (!validos.includes(estado))
      return NextResponse.json({ error: `Estado inválido. Use: ${validos.join(', ')}` }, { status: 400 });

    await db.prepare('UPDATE citas SET estado=? WHERE id=?').run(estado, id);
    if (estado === 'CANCELADA') await db.prepare('UPDATE horarios SET disponible=1 WHERE id=?').run(cita.horario_id);
    return NextResponse.json({ message: `Estado → ${estado}` });
  }

  // Paciente — solo puede cancelar su propia cita
  if (cita.usuario_id !== session.id) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  if (cita.estado === 'CANCELADA')  return NextResponse.json({ error: 'Ya está cancelada.' }, { status: 400 });
  if (cita.estado === 'COMPLETADA') return NextResponse.json({ error: 'No se puede cancelar una cita completada.' }, { status: 400 });

  await db.prepare("UPDATE citas SET estado='CANCELADA' WHERE id=?").run(id);
  await db.prepare('UPDATE horarios SET disponible=1 WHERE id=?').run(cita.horario_id);

  return NextResponse.json({ message: 'Cita cancelada. Horario liberado.' });
}
