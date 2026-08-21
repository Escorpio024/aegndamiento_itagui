import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// GET /api/campanas — lista de campañas
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const rows = await db.prepare(`
    SELECT id, nombre, mensaje_sms, mensaje_email, tipo_canal, estado,
           filtro_zona, filtro_municipios, filtro_sede_id, filtro_estado_cita,
           total_destinatarios, enviados_sms, enviados_email, created_at
    FROM campanas
    ORDER BY created_at DESC
  `).all();

  return NextResponse.json(rows);
}

// POST /api/campanas — crear campaña
export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const {
    nombre, mensaje_sms, mensaje_email, tipo_canal,
    filtro_zona, filtro_municipios,       // ← nuevos: zona y lista de municipios
    filtro_sede_id, filtro_estado_cita,   // ← legacy: filtros por sede/cita
  } = await req.json();

  if (!nombre || !tipo_canal) {
    return NextResponse.json({ error: 'Nombre y tipo de canal son obligatorios.' }, { status: 400 });
  }
  if ((tipo_canal === 'SMS' || tipo_canal === 'AMBOS') && !mensaje_sms) {
    return NextResponse.json({ error: 'El mensaje SMS es obligatorio para este canal.' }, { status: 400 });
  }
  if ((tipo_canal === 'EMAIL' || tipo_canal === 'AMBOS') && !mensaje_email) {
    return NextResponse.json({ error: 'El mensaje de email es obligatorio para este canal.' }, { status: 400 });
  }

  // ─── Contar destinatarios desde demanda_inducida ───────────────
  const params: any[] = [];
  let where = "WHERE 1=1";

  if (filtro_zona) {
    where += ' AND zona = ?';
    params.push(filtro_zona);
  }
  if (filtro_municipios && Array.isArray(filtro_municipios) && filtro_municipios.length > 0) {
    const placeholders = filtro_municipios.map(() => '?').join(',');
    where += ` AND municipio IN (${placeholders})`;
    params.push(...filtro_municipios);
  }

  const countRow = await db.prepare(`
    SELECT COUNT(DISTINCT numero_identificacion) as total
    FROM demanda_inducida
    ${where}
  `).get(...params) as any;

  const total = Number(countRow?.total ?? 0);

  // Guardar municipios como JSON string
  const municipiosJson = filtro_municipios ? JSON.stringify(filtro_municipios) : null;

  const r = await db.prepare(`
    INSERT INTO campanas (nombre, mensaje_sms, mensaje_email, tipo_canal,
      filtro_zona, filtro_municipios, filtro_sede_id, filtro_estado_cita, total_destinatarios)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nombre,
    mensaje_sms ?? null,
    mensaje_email ?? null,
    tipo_canal,
    filtro_zona ?? null,
    municipiosJson,
    filtro_sede_id ?? null,
    filtro_estado_cita ?? null,
    total
  );

  return NextResponse.json({ id: r.lastInsertRowid, total_destinatarios: total }, { status: 201 });
}
