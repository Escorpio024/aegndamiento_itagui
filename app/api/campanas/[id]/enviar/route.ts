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

  let tipos_examen: string[] = [];
  try { tipos_examen = campana.filtro_tipo_examen ? JSON.parse(campana.filtro_tipo_examen) : []; } catch {}

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
  if (tipos_examen.length > 0) {
    const placeholders = tipos_examen.map(() => '?').join(',');
    where += ` AND tipo_examen IN (${placeholders})`;
    queryParams.push(...tipos_examen);
  }

  // 1. Calcular cuántos teléfonos de prueba hay
  const pruebasRaw = campana.telefonos_prueba ? campana.telefonos_prueba.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
  const P = pruebasRaw.length;
  
  // 2. Calcular paginación para SQL
  let sqlLimit = limit;
  let sqlOffset = 0;
  const chunk: any[] = [];
  
  // 3. Añadir teléfonos de prueba si caen en este bloque (offset)
  if (offset < P) {
    const pruebasToTake = pruebasRaw.slice(offset, offset + limit);
    for (const num of pruebasToTake) {
      chunk.push({
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
    sqlLimit = limit - pruebasToTake.length;
    sqlOffset = 0;
  } else {
    sqlLimit = limit;
    sqlOffset = offset - P;
  }
  
  // 4. Hacer la consulta a DB con LIMIT y OFFSET
  if (sqlLimit > 0) {
    let sqlChunk: any[] = [];
    if (campana.destinatarios_ids) {
      const ids = JSON.parse(campana.destinatarios_ids);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        sqlChunk = await db.prepare(`
          SELECT
            numero_identificacion, nombres || ' ' || apellidos AS nombre, telefonos, email, observaciones_demanda_inducida, observacion, datos_especificos, municipio
          FROM demanda_inducida
          WHERE numero_identificacion IN (${placeholders})
          GROUP BY numero_identificacion
          ORDER BY numero_identificacion
          LIMIT ? OFFSET ?
        `).all(...ids, sqlLimit, sqlOffset) as any[];
      }
    } else if (campana.filtro_zona || municipios.length > 0 || tipos_examen.length > 0) {
      sqlChunk = await db.prepare(`
        SELECT
          numero_identificacion, nombres || ' ' || apellidos AS nombre, telefonos, email, observaciones_demanda_inducida, observacion, datos_especificos, municipio
        FROM demanda_inducida
        ${where}
        GROUP BY numero_identificacion
        ORDER BY numero_identificacion
        LIMIT ? OFFSET ?
      `).all(...queryParams, sqlLimit, sqlOffset) as any[];
    }
    chunk.push(...sqlChunk);
  }

  const total = campana.total_destinatarios + P;
  const done  = offset + limit >= total;

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

        // MISMO algoritmo que usa /api/campanas/[id]/destinatarios (ya probado y funciona)
        // Busca cualquier secuencia de 10 dígitos que empiece por 3 (celulares colombianos)
        const matches = fullText.match(/3\d{9}/g) || [];
        // Limitar a máximo 1 celular válido por persona para asegurar que si se eligen 666 personas,
        // no se envíen más de 666 SMS, sin importar si tienen varios celulares registrados.
        const telefonosValidos = [...new Set(matches)].slice(0, 1);

        // Debug: registrar si no se encontró ningún celular
        if (telefonosValidos.length === 0) {
          errores.push(`Sin celular: ${dest.nombre} | tel: ${String(dest.telefonos).slice(0, 30)}`);
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

            // Onurix: error field ausente o = 0 significa éxito.
            // error > 0 (ej: 1000, 1001) significa fallo.
            const onurixError = respJson.error !== undefined && respJson.error !== 0 && respJson.error !== null;

            if (smsRes.ok && !onurixError) {
              enviados_sms++;
              await db.prepare('UPDATE demanda_inducida SET sms_enviado = 1 WHERE numero_identificacion = ?').run(dest.numero_identificacion).catch(() => {});
            } else {
              errores.push(`Error ${dest.nombre} (${numero}): [HTTP ${smsRes.status}] ${respJson.msg || respJson.error || respText}`);
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
      estado = CASE WHEN ? THEN 'ENVIADA' ELSE estado END,
      sent_at = CASE WHEN ? THEN datetime('now','localtime') ELSE sent_at END
    WHERE id = ?
  `).run(enviados_sms, enviados_email, done ? 1 : 0, done ? 1 : 0, id);

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
