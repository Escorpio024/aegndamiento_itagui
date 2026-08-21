import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const maxDuration = 60;

// POST /api/campanas/[id]/enviar — ejecutar el envío (soporta paginación con ?offset=N&limit=M)
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

  // Leer offset y limit de la URL para paginación del cliente
  const url = new URL(req.url);
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
  const limit  = parseInt(url.searchParams.get('limit')  ?? '10', 10);

  const campana = await db.prepare('SELECT * FROM campanas WHERE id = ?').get(id) as any;
  if (!campana) return NextResponse.json({ error: 'Campaña no encontrada.' }, { status: 404 });
  if (campana.estado === 'ENVIADA') return NextResponse.json({ error: 'Esta campaña ya fue enviada.' }, { status: 400 });

  // En la primera llamada (offset=0) marcar como ENVIANDO
  if (offset === 0) {
    if (campana.estado === 'ENVIANDO') {
      return NextResponse.json({ error: 'Esta campaña ya está en proceso de envío. Espera o resetea su estado.' }, { status: 400 });
    }
    await db.prepare("UPDATE campanas SET estado = 'ENVIANDO' WHERE id = ?").run(id);
  }

  // ─── Obtener TODOS los destinatarios (para saber el total y paginar) ────────
  let municipios: string[] = [];
  try { municipios = campana.filtro_municipios ? JSON.parse(campana.filtro_municipios) : []; } catch {}

  const queryParams: any[] = [];
  let where = 'WHERE 1=1';
  if (campana.filtro_zona) {
    where += ' AND zona = ?';
    queryParams.push(campana.filtro_zona);
  }
  if (municipios.length > 0) {
    const placeholders = municipios.map(() => '?').join(',');
    where += ` AND municipio IN (${placeholders})`;
    queryParams.push(...municipios);
  }

  let todosDestinatarios: any[] = [];
  if (campana.filtro_zona || municipios.length > 0) {
    todosDestinatarios = await db.prepare(`
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
  }

  // Agregar teléfonos de prueba (solo en el primer lote)
  const pruebaDestinatarios: any[] = [];
  if (offset === 0 && campana.telefonos_prueba) {
    const pruebas = campana.telefonos_prueba.split(',').map((t: string) => t.trim()).filter(Boolean);
    for (const num of pruebas) {
      pruebaDestinatarios.push({
        numero_identificacion: 'PRUEBA',
        nombre: 'Usuario de Prueba',
        telefonos: num,
        email: null,
        observaciones_demanda_inducida: null,
        observacion: null,
        datos_especificos: null,
        municipio: 'PRUEBA',
      });
    }
  }

  const total = todosDestinatarios.length + (campana.telefonos_prueba ? campana.telefonos_prueba.split(',').filter((t:string) => t.trim()).length : 0);

  // Paginar: tomar solo la porción que procesa esta llamada
  const allDests = [...pruebaDestinatarios, ...todosDestinatarios];
  const chunk    = allDests.slice(offset, offset + limit);
  const done     = offset + limit >= allDests.length;

  const ONURIX_CLIENT = process.env.ONURIX_CLIENT ?? '';
  const ONURIX_KEY    = process.env.ONURIX_KEY    ?? '';

  let enviados_sms   = 0;
  let enviados_email = 0;
  const errores: string[] = [];

  // ─── Enviar SMS a este chunk ─────────────────────────────────────────────
  for (const dest of chunk) {
    if ((campana.tipo_canal === 'SMS' || campana.tipo_canal === 'AMBOS') && campana.mensaje_sms) {
      try {
        const fullText = [
          dest.telefonos, dest.email, dest.observaciones_demanda_inducida,
          dest.observacion, dest.datos_especificos,
        ].filter(Boolean).join(' ');

        const cleanedText = fullText.replace(/(\d)[\s\-\.]+(?=\d)/g, '$1');

        // Parseo codicioso: extrae celulares colombianos, descarta fijos
        const digitBlocks = cleanedText.match(/\d+/g) || [];
        const foundNumbers: string[] = [];
        for (const block of digitBlocks) {
          let pos = 0;
          while (pos <= block.length - 10) {
            const c = block.slice(pos, pos + 10);
            if (/^3\d{9}$/.test(c))      { foundNumbers.push(c); pos += 10; }
            else if (/^6\d{9}$/.test(c)) { pos += 10; }
            else                          { pos += 1; }
          }
        }
        const telefonosValidos = [...new Set(foundNumbers)];

        // Debug: registrar si no se encontr\u00f3 ning\u00fan celular para esta persona
        if (telefonosValidos.length === 0) {
          errores.push(`Sin celular: ${dest.nombre} | tel: ${dest.telefonos || 'vac\u00edo'} | munic: ${dest.municipio}`);
        }

        for (const numeroRaw of telefonosValidos) {
          const numero = `57${numeroRaw}`;
          if (ONURIX_CLIENT && ONURIX_KEY) {
            const controller = new AbortController();
            const tid = setTimeout(() => controller.abort(), 8000);
            let smsRes;
            try {
              smsRes = await fetch('https://www.onurix.com/api/v1/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
                body: new URLSearchParams({ client: ONURIX_CLIENT, key: ONURIX_KEY, phone: numero, sms: campana.mensaje_sms }).toString(),
                signal: controller.signal,
              });
              clearTimeout(tid);
            } catch (err: any) {
              clearTimeout(tid);
              errores.push(`Timeout ${dest.nombre} (${numero}): ${err.message}`);
              continue;
            }
            const respText = await smsRes.text();
            let respJson: any = {};
            try { respJson = JSON.parse(respText); } catch {}
            if (smsRes.ok && !respJson.error && (respJson.status === 'success' || respJson.status === 'ok' || respJson.status === 1 || !respJson.status)) {
              enviados_sms++;
              await db.prepare('UPDATE demanda_inducida SET sms_enviado = 1 WHERE numero_identificacion = ?').run(dest.numero_identificacion).catch(() => {});
            } else {
              errores.push(`Error ${dest.nombre}: ${respJson.msg || respJson.error || respText}`);
            }
          } else {
            console.log(`[SMS DEV] → ${numero} (${dest.nombre}): ${campana.mensaje_sms}`);
            enviados_sms++;
          }
        }
      } catch (e: any) { errores.push(`SMS ${dest.nombre}: ${e.message}`); }
    }

    if ((campana.tipo_canal === 'EMAIL' || campana.tipo_canal === 'AMBOS') && campana.mensaje_email && dest.email) {
      enviados_email++;
    }
  }

  // ─── Actualizar contadores acumulados en la BD ──────────────────────────
  await db.prepare(`
    UPDATE campanas
    SET
      enviados_sms   = enviados_sms   + ?,
      enviados_email = enviados_email + ?,
      total_destinatarios = ?,
      estado = CASE WHEN ? THEN 'ENVIADA' ELSE estado END,
      sent_at = CASE WHEN ? THEN datetime('now','localtime') ELSE sent_at END
    WHERE id = ?
  `).run(enviados_sms, enviados_email, total, done ? 1 : 0, done ? 1 : 0, id);

  return NextResponse.json({
    ok: true,
    offset,
    limit,
    processed: chunk.length,
    total,
    done,
    enviados_sms,
    enviados_email,
    errores: errores.slice(0, 20),
  });
}
