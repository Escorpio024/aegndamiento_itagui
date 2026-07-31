import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// POST /api/horarios/bulk — generación masiva de slots
export async function POST(req: Request) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 }); }

  const { sedeId, doctorId, fechaInicio, fechaFin, diasSemana, horaInicio, horaFin, duracionMinutos } = await req.json();

  if (!sedeId || !doctorId || !fechaInicio || !fechaFin || !horaInicio || !horaFin)
    return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });

  const duracion = duracionMinutos ?? 30;
  const dias: number[] = diasSemana ?? [1, 2, 3, 4, 5]; // Lun-Vie por defecto
  const [hIniH, hIniM] = horaInicio.split(':').map(Number);
  const [hFinH, hFinM] = horaFin.split(':').map(Number);
  const minIni = hIniH * 60 + hIniM;
  const minFin = hFinH * 60 + hFinM;

  const stmts: { sql: string; args: unknown[] }[] = [];
  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin    = new Date(fechaFin    + 'T00:00:00');

  for (const d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
    if (!dias.includes(d.getDay())) continue;
    const fechaStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    for (let m = minIni; m + duracion <= minFin; m += duracion) {
      const hI = `${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`;
      const hF = `${String(Math.floor((m + duracion) / 60)).padStart(2,'0')}:${String((m + duracion) % 60).padStart(2,'0')}`;
      stmts.push({
        sql: 'INSERT OR IGNORE INTO horarios (sede_id, doctor_id, fecha, hora_inicio, hora_fin) VALUES (?,?,?,?,?)',
        args: [sedeId, doctorId, fechaStr, hI, hF],
      });
    }
  }

  if (stmts.length === 0) return NextResponse.json({ message: '0 horarios creados.', creados: 0 }, { status: 201 });

  await db.batch(stmts as any);
  return NextResponse.json({ message: `${stmts.length} horarios creados.`, creados: stmts.length }, { status: 201 });
}
