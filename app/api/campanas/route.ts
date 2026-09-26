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
           filtro_tipo_examen, limite_envios,
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

  const body = await req.json();
  const {
    nombre, mensaje_sms, mensaje_email, tipo_canal,
    filtro_zona, filtro_municipios, filtro_tipo_examen,
    filtro_sede_id, filtro_estado_cita, telefonos_prueba, limite_envios
  } = body;

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
  if (filtro_tipo_examen && Array.isArray(filtro_tipo_examen) && filtro_tipo_examen.length > 0) {
    const placeholders = filtro_tipo_examen.map(() => '?').join(',');
    where += ` AND tipo_examen IN (${placeholders})`;
    params.push(...filtro_tipo_examen);
  }

  let total = 0;
  let destinatarios_ids_json: string | null = null;
  const limitNum = parseInt(limite_envios, 10);

  if (limitNum > 0 && nombre !== '__preview__') {
    // Para la campaña real con límite, seleccionamos N al azar y guardamos los IDs
    const idsRows = await db.prepare(`
      SELECT DISTINCT numero_identificacion
      FROM demanda_inducida
      ${where}
      ORDER BY RANDOM()
      LIMIT ?
    `).all(...params, limitNum) as any[];
    const finalIds = idsRows.map(r => r.numero_identificacion);
    total = finalIds.length;
    destinatarios_ids_json = JSON.stringify(finalIds);
  } else {
    // Si no hay límite o es solo preview, contamos todo normal
    const countRow = await db.prepare(`
      SELECT COUNT(DISTINCT numero_identificacion) as total
      FROM demanda_inducida
      ${where}
    `).get(...params) as any;
    total = Number(countRow?.total ?? 0);
    // Si es preview y hay límite, devolvemos el límite para el UI
    if (nombre === '__preview__' && limitNum > 0 && total > limitNum) {
      total = limitNum;
    }
  }

  const result = await db.prepare(`
    INSERT INTO campanas (
      nombre, mensaje_sms, mensaje_email, tipo_canal, estado,
      filtro_zona, filtro_municipios, filtro_sede_id, filtro_estado_cita, telefonos_prueba,
      filtro_tipo_examen, limite_envios, destinatarios_ids, total_destinatarios
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nombre, mensaje_sms, mensaje_email, tipo_canal, 'PENDIENTE',
    filtro_zona || null, JSON.stringify(filtro_municipios) || '[]',
    filtro_sede_id || null, filtro_estado_cita || null,
    telefonos_prueba || null,
    JSON.stringify(filtro_tipo_examen) || '[]',
    limitNum > 0 ? limitNum : null,
    destinatarios_ids_json,
    total
  );

  return NextResponse.json({ id: result.lastInsertRowid, total_destinatarios: total }, { status: 201 });
}
