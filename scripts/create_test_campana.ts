import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error('Faltan credenciales de Turso');
  }

  const db = createClient({ url, authToken });

  const nombre = 'Campaña de Prueba (Solo Teléfonos de Prueba)';
  const mensaje_sms = 'ISESALUD S.A.S\n\nUsuarios Savia Salud: Unidad Movil en Caceres con mamografia, VPH y PSA. Viernes 21: Jardin. Sabado 22: Hospital Isabel La Catolica. 8am-5pm. Asiste';
  const telefonos_prueba = '3135834781, 3016404175';

  await db.execute({
    sql: `INSERT INTO campanas (
      nombre, mensaje_sms, tipo_canal, estado,
      filtro_zona, filtro_municipios, telefonos_prueba, total_destinatarios
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      nombre,
      mensaje_sms,
      'SMS',
      'PENDIENTE',
      '',
      '[]',
      telefonos_prueba,
      0 // 0 destinatarios reales, solo los de prueba
    ]
  });

  console.log('Campaña de prueba creada con éxito en Turso.');
}

main().catch(console.error);
