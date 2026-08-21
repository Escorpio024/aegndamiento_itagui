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

  // ─── Obtener destinatarios de demanda_inducida ─────────────────
  let municipios: string[] = [];
  try { municipios = campana.filtro_municipios ? JSON.parse(campana.filtro_municipios) : []; } catch {}

  const queryParams: any[] = [];
  let where = "WHERE 1=1";

  if (campana.filtro_zona) {
    where += ' AND zona = ?';
    queryParams.push(campana.filtro_zona);
  }
  if (municipios.length > 0) {
    const placeholders = municipios.map(() => '?').join(',');
    where += ` AND municipio IN (${placeholders})`;
    queryParams.push(...municipios);
  }

  const destinatarios = await db.prepare(`
    SELECT DISTINCT
      numero_identificacion,
      nombres || ' ' || apellidos AS nombre,
      telefonos,
      email,
      observaciones_demanda_inducida,
      observacion,
      datos_especificos,
      municipio
    FROM demanda_inducida
    ${where}
  `).all(...queryParams) as any[];

  // ─── Agregar teléfonos de prueba ────────────────────────────────────────
  if (campana.telefonos_prueba) {
    const pruebas = campana.telefonos_prueba.split(',').map((t: string) => t.trim()).filter(Boolean);
    for (const num of pruebas) {
      destinatarios.push({
        numero_identificacion: 'PRUEBA',
        nombre: 'Usuario de Prueba',
        telefonos: num, // Forzamos a que entre aquí
        email: null,
        observaciones_demanda_inducida: null,
        observacion: null,
        datos_especificos: null,
        municipio: 'PRUEBA'
      });
    }
  }

  const ONURIX_CLIENT = process.env.ONURIX_CLIENT ?? '';
  const ONURIX_KEY    = process.env.ONURIX_KEY ?? '';

  let enviados_sms = 0;
  let enviados_email = 0;
  const errores: string[] = [];

  for (const dest of destinatarios) {
    // ── SMS ─────────────────────────────────────────────────────────
    if ((campana.tipo_canal === 'SMS' || campana.tipo_canal === 'AMBOS') && campana.mensaje_sms) {
      
      const fullText = [
        dest.telefonos, dest.email, dest.observaciones_demanda_inducida,
        dest.observacion, dest.datos_especificos
      ].filter(Boolean).join(' ');

      // Extraer números válidos de celular Colombia (10 dígitos que empiecen por 3)
      const matches = fullText.match(/3\d{9}/g) || [];
      const telefonosValidos = [...new Set(matches)]; // Únicos

      for (const numeroRaw of telefonosValidos) {
        try {
          const numero = `57${numeroRaw}`;

          if (ONURIX_CLIENT && ONURIX_KEY) {
            const body = new URLSearchParams({
              client:  ONURIX_CLIENT,
              key:     ONURIX_KEY,
              phone:   numero,
              sms:     campana.mensaje_sms,
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
            try { respJson = JSON.parse(respText); } catch { /* no-JSON */ }

            if (smsRes.ok) {
              enviados_sms++;
              // Marcar como enviado en la BD
              await db.prepare(
                'UPDATE demanda_inducida SET sms_enviado = 1 WHERE numero_identificacion = ?'
              ).run(dest.numero_identificacion).catch(() => {});
            } else {
              errores.push(`SMS ${dest.nombre} (${numero}): ${respJson.message ?? respText}`);
            }
          } else {
            // Modo desarrollo — sin credenciales
            console.log(`[SMS DEV] → ${numero} (${dest.nombre} - ${dest.municipio}): ${campana.mensaje_sms}`);
            enviados_sms++;
          }
        } catch (e: any) {
          errores.push(`SMS ${dest.nombre}: ${e.message}`);
        }
      }
    }

    // ── Email ────────────────────────────────────────────────────────
    if ((campana.tipo_canal === 'EMAIL' || campana.tipo_canal === 'AMBOS') && campana.mensaje_email && dest.email) {
      try {
        // TODO: integrar proveedor de email (SendGrid / Nodemailer)
        console.log(`[EMAIL DEV] → ${dest.email} (${dest.nombre}): ${campana.mensaje_email}`);
        enviados_email++;
      } catch (e: any) {
        errores.push(`Email ${dest.nombre}: ${e.message}`);
      }
    }
  }

  // ─── Actualizar estadísticas ────────────────────────────────────
  await db.prepare(`
    UPDATE campanas
    SET estado = 'ENVIADA', enviados_sms = ?, enviados_email = ?,
        total_destinatarios = ?, sent_at = datetime('now','localtime')
    WHERE id = ?
  `).run(enviados_sms, enviados_email, destinatarios.length, id);

  return NextResponse.json({
    ok: true,
    total: destinatarios.length,
    enviados_sms,
    enviados_email,
    errores: errores.slice(0, 30),
  });
}
