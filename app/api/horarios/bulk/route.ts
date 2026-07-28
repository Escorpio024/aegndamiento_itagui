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

  const stmt = db.prepare(
    'INSERT OR IGNORE INTO horarios (sede_id, doctor_id, fecha, hora_inicio, hora_fin) VALUES (?,?,?,?,?)'
  );

  let creados = 0;
  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin    = new Date(fechaFin    + 'T00:00:00');

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
      if (!dias.includes(d.getDay())) continue;
      const fechaStr = d.toISOString().split('T')[0];

      for (let m = minIni; m + duracion <= minFin; m += duracion) {
        const hI = String(Math.floor(m / 60)).padStart(2, '0');
        const mI = String(m % 60).padStart(2, '0');
        const hF = String(Math.floor((m + duracion) / 60)).padStart(2, '0');
        const mF = String((m + duracion) % 60).padStart(2, '0');
        const r = stmt.run(sedeId, doctorId, fechaStr, `${hI}:${mI}`, `${hF}:${mF}`);
        creados += Number(r.changes);
      }
    }
    db.exec('COMMIT;');
  } catch(e) {
    db.exec('ROLLBACK;');
    throw e;
  }
  return NextResponse.json({ message: `${creados} horarios creados.`, creados }, { status: 201 });
}
