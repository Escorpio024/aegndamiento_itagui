import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

/**
 * GET /api/campanas/count
 * Devuelve el conteo de destinatarios potenciales para los filtros dados,
 * SIN crear ningún registro en la BD.
 *
 * Query params:
 *   zona           — string (opcional)
 *   municipios     — JSON string de string[] (opcional)
 *   tipos_examen   — JSON string de string[] (opcional)
 *   limite_envios  — number (opcional)
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const url = new URL(req.url);
  const filtro_zona = url.searchParams.get('zona') ?? '';
  const limitParam  = url.searchParams.get('limite_envios') ?? '';

  let filtro_municipios: string[] = [];
  try { filtro_municipios = JSON.parse(url.searchParams.get('municipios') ?? '[]'); } catch {}

  let filtro_tipo_examen: string[] = [];
  try { filtro_tipo_examen = JSON.parse(url.searchParams.get('tipos_examen') ?? '[]'); } catch {}

  // Si no hay ningún filtro activo devolvemos 0 directamente (sin query)
  if (!filtro_zona && filtro_municipios.length === 0 && filtro_tipo_examen.length === 0) {
    return NextResponse.json({ total: 0 });
  }

  // Construir WHERE idéntico al de POST /api/campanas
  const params: any[] = [];
  let where = 'WHERE 1=1';

  if (filtro_zona) {
    where += ' AND zona = ?';
    params.push(filtro_zona);
  }
  if (filtro_municipios.length > 0) {
    const ph = filtro_municipios.map(() => '?').join(',');
    where += ` AND municipio IN (${ph})`;
    params.push(...filtro_municipios);
  }
  if (filtro_tipo_examen.length > 0) {
    const ph = filtro_tipo_examen.map(() => '?').join(',');
    where += ` AND tipo_examen IN (${ph})`;
    params.push(...filtro_tipo_examen);
  }

  const limitNum = parseInt(limitParam, 10);

  // Contar total de personas únicas
  const countRow = await db.prepare(`
    SELECT COUNT(DISTINCT numero_identificacion) AS total
    FROM demanda_inducida
    ${where}
  `).get(...params) as any;

  let total = Number(countRow?.total ?? 0);

  // Si hay límite y hay más personas que el límite, el real enviado será el límite
  if (limitNum > 0 && total > limitNum) {
    total = limitNum;
  }

  return NextResponse.json({ total });
}
