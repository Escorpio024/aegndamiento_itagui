import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession, requireSession, requireAdmin } from '@/lib/auth';

const CITA_JOIN = `
  SELECT c.*,
    p.nombre AS procedimiento_nombre, p.cups, p.contraste,
    s.nombre AS sede_nombre, s.direccion AS sede_direccion, s.telefono AS sede_telefono,
    h.fecha, h.hora_inicio, h.hora_fin,
    d.nombre AS doctor_nombre, d.especialidad AS doctor_especialidad,
    u.nombre AS paciente_nombre, u.documento, u.telefono AS paciente_telefono
  FROM citas c
  JOIN procedimientos p ON p.id=c.procedimiento_id
  JOIN sedes          s ON s.id=c.sede_id
  JOIN horarios       h ON h.id=c.horario_id
  JOIN doctores       d ON d.id=h.doctor_id
  JOIN usuarios       u ON u.id=c.usuario_id
`;

// GET /api/citas — mis citas (paciente) o todas (admin)
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado');
  const sedeId = searchParams.get('sedeId');
  const fecha  = searchParams.get('fecha');

  if (session.rol === 'admin') {
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (estado) { where += ' AND c.estado=?'; params.push(estado); }
    if (sedeId) { where += ' AND c.sede_id=?'; params.push(sedeId); }
    if (fecha)  { where += ' AND h.fecha=?';   params.push(fecha); }
    const rows = await db.prepare(`${CITA_JOIN} ${where} ORDER BY h.fecha DESC, h.hora_inicio DESC`).all(...params);
    return NextResponse.json(rows);
  }

  // Paciente — solo sus citas
  const rows = await db.prepare(
    `${CITA_JOIN} WHERE c.usuario_id=? ORDER BY h.fecha DESC, h.hora_inicio DESC`
  ).all(session.id);
  return NextResponse.json(rows);
}

// POST /api/citas — solicitar cita (paciente autenticado)
export async function POST(req: Request) {
  let session;
  try { session = await requireSession(); } catch { return NextResponse.json({ error: 'No autenticado.' }, { status: 401 }); }

  const { procedimientoId, horarioId, sedeId, autorizacion, observaciones } = await req.json();
  if (!procedimientoId || !horarioId || !sedeId)
    return NextResponse.json({ error: 'Procedimiento, horario y sede son obligatorios.' }, { status: 400 });

  const horario = await db.prepare('SELECT * FROM horarios WHERE id=? AND disponible=1').get(horarioId) as any;
  if (!horario) return NextResponse.json({ error: 'El horario ya no está disponible.' }, { status: 409 });
  if (horario.sede_id !== Number(sedeId)) return NextResponse.json({ error: 'Sede no coincide con el horario.' }, { status: 400 });

  try {
    const r = await db.prepare(
      `INSERT INTO citas (usuario_id, procedimiento_id, horario_id, sede_id, autorizacion, observaciones, estado)
       VALUES (?,?,?,?,?,?, 'CONFIRMADA')`
    ).run(session.id, procedimientoId, horarioId, sedeId, autorizacion ?? null, observaciones ?? null);

    await db.prepare('UPDATE horarios SET disponible=0 WHERE id=?').run(horarioId);

    const cita = await db.prepare(`${CITA_JOIN} WHERE c.id=?`).get(r.lastInsertRowid);
    return NextResponse.json(cita, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) return NextResponse.json({ error: 'Ese horario ya fue reservado.' }, { status: 409 });
    throw err;
  }
}
