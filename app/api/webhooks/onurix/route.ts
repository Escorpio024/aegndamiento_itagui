import { NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * POST /api/webhooks/onurix
 * Onurix llama a este endpoint para notificar el estado de los SMS enviados
 * y los mensajes entrantes de los pacientes.
 *
 * Configurar en el portal de Onurix:
 *   Webhook URL → https://[tu-dominio.vercel.app]/api/webhooks/onurix
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Onurix envía diferentes tipos de eventos
    const { type, messageId, phone, status, message, from } = body;

    // ── Evento: actualización de estado de entrega ──────────────────
    if (type === 'delivery' || status) {
      const deliveryStatus = type === 'delivery' ? body.status : status;

      if (deliveryStatus === 'delivered' || deliveryStatus === 'sent') {
        // Marcar el SMS como enviado en la tabla demanda_inducida
        // Onurix envía el teléfono del destinatario para identificar al paciente
        const tel = phone || from || '';
        if (tel) {
          await db.prepare(
            `UPDATE demanda_inducida SET sms_enviado = 1 WHERE telefonos = ? AND sms_enviado = 0`
          ).run(tel.replace(/\D/g, ''));
        }
      }

      // Guardar log del evento en notificaciones_globales si existe la tabla
      try {
        await db.prepare(
          `INSERT INTO notificaciones_globales (tipo, contenido, created_at)
           VALUES (?, ?, datetime('now','localtime'))`
        ).run('sms_status', JSON.stringify({ messageId, phone, status: deliveryStatus }));
      } catch {
        // La tabla puede no existir aún, no es crítico
      }
    }

    // ── Evento: mensaje entrante de un paciente ─────────────────────
    if (type === 'inbound' || message) {
      const senderPhone = from || phone || '';
      const text = message || body.text || '';

      // Guardar la respuesta del paciente en notificaciones_globales
      try {
        await db.prepare(
          `INSERT INTO notificaciones_globales (tipo, contenido, created_at)
           VALUES (?, ?, datetime('now','localtime'))`
        ).run('sms_respuesta', JSON.stringify({ de: senderPhone, texto: text }));
      } catch {
        // Silencioso si la tabla no existe
      }
    }

    // Siempre responder 200 OK para que Onurix sepa que recibimos el evento
    return NextResponse.json({ ok: true, received: true });
  } catch (error) {
    console.error('[Webhook Onurix] Error:', error);
    // Aún así respondemos 200 para evitar reintentos infinitos de Onurix
    return NextResponse.json({ ok: true, received: true });
  }
}

// Onurix también puede hacer GET para verificar que el endpoint existe
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Aurora Agenda - Onurix Webhook',
    status: 'active',
  });
}
