import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const maxDuration = 60; // Permitir hasta 60 segundos en Vercel Hobby

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
  if (campana.estado === 'ENVIANDO') return NextResponse.json({ error: 'Esta campaña ya está en proceso de envío. Espera o resetea su estado.' }, { status: 400 });

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

  let destinatarios: any[] = [];
  
  // Evitar consultar 500k registros si no hay filtros aplicados y se trata de una prueba
  if (campana.filtro_zona || municipios.length > 0) {
    destinatarios = await db.prepare(`
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

  // Procesar en bloques para no superar el timeout de Vercel
  const BATCH_SIZE = 50;
    
  for (let i = 0; i < destinatarios.length; i += BATCH_SIZE) {
    const chunk = destinatarios.slice(i, i + BATCH_SIZE);
    
    await Promise.all(chunk.map(async (dest) => {
      // ── SMS ────────────────────────────────────────────────────────
      if ((campana.tipo_canal === 'SMS' || campana.tipo_canal === 'AMBOS') && campana.mensaje_sms) {
        try {
          const fullText = [
            dest.telefonos, dest.email, dest.observaciones_demanda_inducida,
            dest.observacion, dest.datos_especificos
          ].filter(Boolean).join(' ');

          // Limpiar espacios, guiones o puntos que estén ENTRE números (ej: "300 123 45 67" -> "3001234567")
          const cleanedText = fullText.replace(/(\d)[\s\-\.]+(?=\d)/g, '$1');

          // Extraer bloques de dígitos continuos (ej: "60424306473137572521" o "3147305617")
          const digitBlocks = cleanedText.match(/\d+/g) || [];
          const foundNumbers: string[] = [];

          for (const block of digitBlocks) {
            // Partir cada bloque en trozos de 10 dígitos (tamaño estándar de números colombianos)
            // Ej: "60424306473137572521" → ["6042430647", "3137572521"]
            // Esto evita extraer números falsos del medio de un bloque largo
            if (block.length % 10 === 0) {
              for (let p = 0; p < block.length; p += 10) {
                foundNumbers.push(block.slice(p, p + 10));
              }
            } else if (block.length === 10) {
              foundNumbers.push(block);
            }
            // Números de longitud irregular: intentar extraer con regex como fallback
            else if (block.length > 10) {
              const fallback = block.match(/3\d{9}/g) || [];
              foundNumbers.push(...fallback);
            }
          }

          // Filtrar: solo celulares colombianos (10 dígitos que empiecen con 3)
          // Excluye fijos (604..., 605..., etc.) y números inválidos
          const telefonosValidos = [...new Set(
            foundNumbers.filter(n => /^3\d{9}$/.test(n))
          )];

          for (const numeroRaw of telefonosValidos) {
            const numero = `57${numeroRaw}`;
            if (ONURIX_CLIENT && ONURIX_KEY) {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 6000); 
              
              let smsRes;
              try {
                smsRes = await fetch('https://www.onurix.com/api/v1/sms/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
                  body: new URLSearchParams({
                    client: ONURIX_CLIENT,
                    key: ONURIX_KEY,
                    phone: numero,
                    sms: campana.mensaje_sms,
                  }).toString(),
                  signal: controller.signal,
                });
                clearTimeout(timeoutId);
              } catch (err: any) {
                clearTimeout(timeoutId);
                errores.push(`SMS ${dest.nombre}: Timeout (${err.message})`);
                continue;
              }

              const respText = await smsRes.text();
              let respJson: any = {};
              try { respJson = JSON.parse(respText); } catch { }

              if (smsRes.ok && !respJson.error && (respJson.status === 'success' || respJson.status === 'ok' || respJson.status === 1 || !respJson.status)) {
                enviados_sms++;
                await db.prepare('UPDATE demanda_inducida SET sms_enviado = 1 WHERE numero_identificacion = ?').run(dest.numero_identificacion).catch(() => {});
              } else {
                errores.push(`SMS ${dest.nombre}: ${respJson.msg || respJson.error || respText}`);
              }
            } else {
              console.log(`[SMS DEV] → ${numero} (${dest.nombre}): ${campana.mensaje_sms}`);
              enviados_sms++;
            }
          }
        } catch (e: any) { errores.push(`SMS ${dest.nombre}: ${e.message}`); }
      }

      // ── Email ────────────────────────────────────────────────────────
      if ((campana.tipo_canal === 'EMAIL' || campana.tipo_canal === 'AMBOS') && campana.mensaje_email && dest.email) {
        try {
          enviados_email++;
        } catch (e: any) { errores.push(`Email ${dest.nombre}: ${e.message}`); }
      }
    }));
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
