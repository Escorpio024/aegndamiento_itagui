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
  let where = "WHERE 1=1";

  if (campana.filtro_zona) {
    where += ' AND d.zona = ?';
    queryParams.push(campana.filtro_zona);
  }
  if (municipios.length > 0) {
    const placeholders = municipios.map(() => '?').join(',');
    where += ` AND d.municipio IN (${placeholders})`;
    queryParams.push(...municipios);
  }

  const rawRows = await db.prepare(`
    SELECT
      d.numero_identificacion AS documento,
      d.nombres || ' ' || d.apellidos AS nombre,
      d.telefonos,
      d.email,
      d.observaciones_demanda_inducida,
      d.observacion,
      d.datos_especificos,
      d.zona,
      d.municipio,
      d.tipo_examen
    FROM demanda_inducida d
    ${where}
    ORDER BY d.zona, d.municipio, d.apellidos
  `).all(...queryParams) as any[];

  // ─── Extraer teléfonos de múltiples campos usando Regex ─────────────────
  const rows = [];
  for (const row of rawRows) {
    const fullText = [
      row.telefonos, row.email, row.observaciones_demanda_inducida,
      row.observacion, row.datos_especificos
    ].filter(Boolean).join(' ');

    // Buscar secuencias de 10 dígitos que empiecen por 3 (formato celular Colombia)
    const matches = fullText.match(/3\d{9}/g) || [];
    const telefonosValidos = [...new Set(matches)]; // Únicos

    if (telefonosValidos.length > 0) {
      rows.push({
        documento: row.documento,
        nombre: row.nombre,
        telefono: telefonosValidos.join(', '), // Mostrar todos los encontrados
        email: row.email,
        zona: row.zona,
        municipio: row.municipio,
        tipo_examen: row.tipo_examen,
      });
    }
  }

  return NextResponse.json(rows);
}
