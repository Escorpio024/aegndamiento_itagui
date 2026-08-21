const { createClient } = require('@libsql/client');

async function main() {
  const db = createClient({ url: 'file:./agendamiento.db' });
  const ONURIX_CLIENT = '8507';
  const ONURIX_KEY = 'f3a2a9bd9e0f3c250d8626dae9c6709b552f7b616a86377878279';

  const testNumbers = ['573135834781', '573016404175'];
  const mensaje = "ISESALUD S.A.S\n\nUsuarios Savia Salud: Unidad Movil en Caceres con mamografia, VPH y PSA. Viernes 21: Jardin. Sabado 22: Hospital Isabel La Catolica. 8am-5pm. Asiste";

  console.log('Enviando SMS de prueba a:', testNumbers);

  for (const numero of testNumbers) {
    const body = new URLSearchParams({
      client: ONURIX_CLIENT,
      key: ONURIX_KEY,
      number: numero,
      message: mensaje,
    });

    const res = await fetch('https://www.onurix.com/api/v1/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: body.toString(),
    });

    const text = await res.text();
    console.log(`Respuesta para ${numero}:`, text);
  }

  console.log('\nConsultando zonas para Cáceres y Jardín...');
  const zonas = await db.execute("SELECT DISTINCT zona, municipio FROM demanda_inducida WHERE municipio LIKE '%CACERES%' OR municipio LIKE '%JARDIN%'");
  console.log(zonas.rows);

  // Insertar la campaña
  // const filterMuns = JSON.stringify(['Cáceres', 'Jardín']);
  // await db.execute({
  //   sql: "INSERT INTO campanas (nombre, mensaje_sms, tipo_canal, estado, enviados_sms, enviados_email, total_destinatarios, filtro_zona, filtro_municipios) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  //   args: ['Unidad Movil Caceres/Jardin', mensaje, 'SMS', 'PENDIENTE', 0, 0, 0, '', filterMuns]
  // });
}

main().catch(console.error);
