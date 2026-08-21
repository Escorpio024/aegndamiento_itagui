import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// POST /api/campanas/[id]/enviar — ejecutar el envío de la campaña
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
  }

  const { id } = await params;
  const campana = await db.prepare('SELECT * FROM campanas WHERE id = ?').get(id) as any;
  if (!campana) return NextResponse.json({ error: 'Campaña no encontrada.' }, { status: 404 });
  if (campana.estado === 'ENVIADA') return NextResponse.json({ error: 'Esta campaña ya fue enviada.' }, { status: 400 });

  // Actualizar estado a ENVIANDO
  await db.prepare("UPDATE campanas SET estado = 'ENVIANDO' WHERE id = ?").run(id);

  const queryParams: any[] = [];
  let where = 'WHERE 1=1';
  if (campana.filtro_sede_id) { where += ' AND c.sede_id = ?'; queryParams.push(campana.filtro_sede_id); }
  if (campana.filtro_estado_cita) { where += ' AND c.estado = ?'; queryParams.push(campana.filtro_estado_cita); }

  const destinatarios = await db.prepare(`
    SELECT DISTINCT u.id, u.nombre, u.telefono, u.email
    FROM citas c
    JOIN usuarios u ON u.id = c.usuario_id
    ${where}
  `).all(...queryParams) as any[];

  let enviados_sms = 0;
  let enviados_email = 0;
  const errores: string[] = [];

  for (const dest of destinatarios) {
    // ── SMS ─────────────────────────────────────────
    if ((campana.tipo_canal === 'SMS' || campana.tipo_canal === 'AMBOS') && campana.mensaje_sms && dest.telefono) {
      try {
        const ONURIX_CLIENT = process.env.ONURIX_CLIENT ?? '';
        const ONURIX_KEY    = process.env.ONURIX_KEY ?? '';

        if (ONURIX_CLIENT && ONURIX_KEY) {
          // Normalizar número: quitar espacios/guiones y agregar prefijo Colombia (57) si no lo tiene
          let numero = String(dest.telefono).replace(/[\s\-\(\)]/g, '');
          if (!numero.startsWith('57')) numero = `57${numero}`;

          const body = new URLSearchParams({
            client:  ONURIX_CLIENT,
            key:     ONURIX_KEY,
            number:  numero,
            message: campana.mensaje_sms,
          });

          const smsRes = await fetch('https://www.onurix.com/api/v1/sms/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept':       'application/json',
            },
            body: body.toString(),
          });

          const respText = await smsRes.text();
          let respJson: any = {};
          try { respJson = JSON.parse(respText); } catch { /* respuesta no-JSON */ }

          if (smsRes.ok && (respJson.status === 'success' || respJson.status === 'ok' || smsRes.status === 200)) {
            enviados_sms++;
          } else {
            errores.push(`SMS ${dest.nombre} (${numero}): ${respJson.message ?? respText}`);
          }
        } else {
          // Sin credenciales — modo desarrollo
          console.log(`[SMS DEV] → ${dest.telefono}: ${campana.mensaje_sms}`);
          enviados_sms++;
        }
      } catch (e: any) {
        errores.push(`SMS ${dest.nombre}: ${e.message}`);
      }
    }


    // ── Email ────────────────────────────────────────
    if ((campana.tipo_canal === 'EMAIL' || campana.tipo_canal === 'AMBOS') && campana.mensaje_email && dest.email) {
      try {
        // Aquí irá la integración de email (SMTP / SendGrid / etc.)
        // Por ahora se registra el log para cuando se configure el proveedor
        console.log(`[EMAIL DEV] → ${dest.email}: ${campana.mensaje_email}`);
        enviados_email++;
      } catch (e: any) {
        errores.push(`Email ${dest.nombre}: ${e.message}`);
      }
    }
  }

  // Actualizar estadísticas de campaña
  await db.prepare(`
    UPDATE campanas
    SET estado = 'ENVIADA', enviados_sms = ?, enviados_email = ?, sent_at = datetime('now','localtime')
    WHERE id = ?
  `).run(enviados_sms, enviados_email, id);

  return NextResponse.json({
    ok: true,
    total: destinatarios.length,
    enviados_sms,
    enviados_email,
    errores: errores.slice(0, 20),
  });
}
