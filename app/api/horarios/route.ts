import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession, requireAdmin } from '@/lib/auth';

// GET /api/horarios?sedeId=&fecha=&admin=true
export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const sedeId = searchParams.get('sedeId');
  const fecha  = searchParams.get('fecha');
  const isAdmin = searchParams.get('admin') === 'true' && session?.rol === 'admin';

  const params: unknown[] = [];
  let where = isAdmin ? 'WHERE 1=1' : 'WHERE h.disponible=1';

  if (sedeId) { where += ' AND h.sede_id=?'; params.push(sedeId); }
  if (fecha)  { where += ' AND h.fecha=?';   params.push(fecha); }

  const query = `
    SELECT h.*,
           s.nombre AS sede_nombre,
           d.nombre AS doctor_nombre, d.especialidad
           ${isAdmin ? `, c.id AS cita_id, c.estado AS cita_estado, u.nombre AS paciente_nombre` : ''}
    FROM horarios h
    JOIN sedes    s ON s.id=h.sede_id
    JOIN doctores d ON d.id=h.doctor_id
    ${isAdmin ? `LEFT JOIN citas c ON c.horario_id=h.id LEFT JOIN usuarios u ON u.id=c.usuario_id` : ''}
    ${where}
    ORDER BY h.fecha, h.hora_inicio
  `;

  return NextResponse.json(db.prepare(query).all(...params));
}

// POST /api/horarios — slot único (admin)
export async function POST(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }

  const { sedeId, doctorId, fecha, horaInicio, horaFin } = await req.json();
  if (!sedeId || !doctorId || !fecha || !horaInicio || !horaFin)
    return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });

  const result = db.prepare(
    'INSERT INTO horarios (sede_id, doctor_id, fecha, hora_inicio, hora_fin) VALUES (?,?,?,?,?)'
  ).run(sedeId, doctorId, fecha, horaInicio, horaFin);

  return NextResponse.json(db.prepare('SELECT * FROM horarios WHERE id=?').get(result.lastInsertRowid), { status: 201 });
}
