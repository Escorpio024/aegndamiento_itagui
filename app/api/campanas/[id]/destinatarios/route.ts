import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/campanas/[id]/destinatarios — usuarios filtrados por zona/municipio
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

  // Parsear municipios (guardados como JSON string)
  let municipios: string[] = [];
  try { municipios = campana.filtro_municipios ? JSON.parse(campana.filtro_municipios) : []; } catch {}

  const queryParams: any[] = [];
  let where = "WHERE d.telefonos IS NOT NULL AND d.telefonos != ''";

  if (campana.filtro_zona) {
    where += ' AND d.zona = ?';
    queryParams.push(campana.filtro_zona);
  }
  if (municipios.length > 0) {
    const placeholders = municipios.map(() => '?').join(',');
    where += ` AND d.municipio IN (${placeholders})`;
    queryParams.push(...municipios);
  }

  const rows = await db.prepare(`
    SELECT
      d.numero_identificacion AS documento,
      d.nombres || ' ' || d.apellidos AS nombre,
      d.telefonos AS telefono,
      d.email,
      d.zona,
      d.municipio,
      d.tipo_examen
    FROM demanda_inducida d
    ${where}
    ORDER BY d.zona, d.municipio, d.apellidos
  `).all(...queryParams);

  return NextResponse.json(rows);
}
