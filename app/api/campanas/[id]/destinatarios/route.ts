import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/campanas/[id]/destinatarios — lista de usuarios destino
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { id } = await params;
  const campana = await db.prepare('SELECT * FROM campanas WHERE id = ?').get(id) as any;
  if (!campana) return NextResponse.json({ error: 'Campaña no encontrada.' }, { status: 404 });

  const queryParams: any[] = [];
  let where = 'WHERE 1=1';
  if (campana.filtro_sede_id) { where += ' AND c.sede_id = ?'; queryParams.push(campana.filtro_sede_id); }
  if (campana.filtro_estado_cita) { where += ' AND c.estado = ?'; queryParams.push(campana.filtro_estado_cita); }

  const rows = await db.prepare(`
    SELECT DISTINCT u.id, u.nombre, u.telefono, u.email, u.documento,
      s.nombre AS sede_nombre
    FROM citas c
    JOIN usuarios u ON u.id = c.usuario_id
    JOIN sedes s ON s.id = c.sede_id
    ${where}
    ORDER BY u.nombre
  `).all(...queryParams);

  return NextResponse.json(rows);
}
