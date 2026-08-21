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
           filtro_sede_id, filtro_estado_cita, total_destinatarios,
           enviados_sms, enviados_email, created_at
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

  const { nombre, mensaje_sms, mensaje_email, tipo_canal, filtro_sede_id, filtro_estado_cita } = await req.json();

  if (!nombre || !tipo_canal) {
    return NextResponse.json({ error: 'Nombre y tipo de canal son obligatorios.' }, { status: 400 });
  }
  if ((tipo_canal === 'SMS' || tipo_canal === 'AMBOS') && !mensaje_sms) {
    return NextResponse.json({ error: 'El mensaje SMS es obligatorio para este canal.' }, { status: 400 });
  }
  if ((tipo_canal === 'EMAIL' || tipo_canal === 'AMBOS') && !mensaje_email) {
    return NextResponse.json({ error: 'El mensaje de email es obligatorio para este canal.' }, { status: 400 });
  }

  // Contar destinatarios
  const params: any[] = [];
  let where = 'WHERE 1=1';
  if (filtro_sede_id) { where += ' AND c.sede_id = ?'; params.push(filtro_sede_id); }
  if (filtro_estado_cita) { where += ' AND c.estado = ?'; params.push(filtro_estado_cita); }

  const countRow = await db.prepare(`
    SELECT COUNT(DISTINCT u.id) as total
    FROM citas c
    JOIN usuarios u ON u.id = c.usuario_id
    ${where}
  `).get(...params) as any;

  const total = Number(countRow?.total ?? 0);

  const r = await db.prepare(`
    INSERT INTO campanas (nombre, mensaje_sms, mensaje_email, tipo_canal, filtro_sede_id, filtro_estado_cita, total_destinatarios)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(nombre, mensaje_sms ?? null, mensaje_email ?? null, tipo_canal, filtro_sede_id ?? null, filtro_estado_cita ?? null, total);

  return NextResponse.json({ id: r.lastInsertRowid, total_destinatarios: total }, { status: 201 });
}
