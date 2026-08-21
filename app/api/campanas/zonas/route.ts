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

  // ── Zonas con su total de pacientes ────────────────────────────────────────
  const zonaRows = await db.prepare(`
    SELECT zona, COUNT(*) as total
    FROM demanda_inducida
    WHERE zona IS NOT NULL AND zona != ''
    GROUP BY zona
    ORDER BY total DESC
  `).all() as { zona: string; total: number }[];

  // ── Todos los municipios únicos con su total ────────────────────────────────
  // (Sin filtrar por zona para que el admin vea siempre los 127 municipios)
  const municipioRows = await db.prepare(`
    SELECT municipio, zona, COUNT(*) as total
    FROM demanda_inducida
    WHERE municipio IS NOT NULL AND municipio != ''
    GROUP BY municipio, zona
    ORDER BY municipio
  `).all() as { municipio: string; zona: string; total: number }[];

  // Agregar municipios únicos (un municipio puede aparecer en varias zonas)
  const municipioMap: Record<string, number> = {};
  for (const row of municipioRows) {
    const key = row.municipio;
    municipioMap[key] = (municipioMap[key] || 0) + Number(row.total);
  }

  const municipiosUnicos = Object.entries(municipioMap)
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  // Agrupar municipios por zona
  const zonaMap: Record<string, { municipios: { nombre: string; total: number }[]; total: number }> = {};
  for (const row of municipioRows) {
    const z = row.zona ?? 'Sin zona';
    if (!zonaMap[z]) zonaMap[z] = { municipios: [], total: 0 };
    // Evitar duplicados en zona
    if (!zonaMap[z].municipios.find(m => m.nombre === row.municipio)) {
      zonaMap[z].municipios.push({ nombre: row.municipio, total: Number(row.total) });
    }
    zonaMap[z].total += Number(row.total);
  }

  const zonas = Object.entries(zonaMap).map(([nombre, data]) => ({
    nombre,
    total: data.total,
    municipios: data.municipios.sort((a, b) => a.nombre.localeCompare(b.nombre)),
  }));

  return NextResponse.json({
    zonas,
    // Lista plana de todos los municipios únicos (para el selector sin filtro de zona)
    municipios: municipiosUnicos,
    totales: {
      zonas: zonas.length,
      municipios: municipiosUnicos.length,
      pacientes: municipiosUnicos.reduce((s, m) => s + m.total, 0),
    }
  });
}
