import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/campanas/zonas — zonas y municipios disponibles en demanda_inducida
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  // Obtener todas las zonas y municipios únicos que existen en la BD
  const rows = await db.prepare(`
    SELECT zona, municipio, COUNT(*) as total
    FROM demanda_inducida
    WHERE zona IS NOT NULL AND zona != ''
    GROUP BY zona, municipio
    ORDER BY zona, municipio
  `).all() as { zona: string; municipio: string; total: number }[];

  // Agrupar por zona
  const zonaMap: Record<string, { municipios: { nombre: string; total: number }[]; total: number }> = {};
  for (const row of rows) {
    const z = row.zona ?? 'Sin zona';
    if (!zonaMap[z]) zonaMap[z] = { municipios: [], total: 0 };
    zonaMap[z].municipios.push({ nombre: row.municipio, total: Number(row.total) });
    zonaMap[z].total += Number(row.total);
  }

  const zonas = Object.entries(zonaMap).map(([nombre, data]) => ({
    nombre,
    total: data.total,
    municipios: data.municipios,
  }));

  return NextResponse.json(zonas);
}
