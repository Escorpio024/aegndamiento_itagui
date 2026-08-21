async function main() {
  const ONURIX_CLIENT = '8507';
  const ONURIX_KEY = 'f3a2a9bd9e0f3c250d8626dae9c6709b552f7b616a86377878279';

  const testNumbers = ['573135834781', '573016404175'];
  const mensaje = "ISESALUD S.A.S\n\nUsuarios Savia Salud: Unidad Movil en Caceres con mamografia, VPH y PSA. Viernes 21: Jardin. Sabado 22: Hospital Isabel La Catolica. 8am-5pm. Asiste";

  console.log('Enviando SMS de prueba a:', testNumbers);

  for (const numero of testNumbers) {
    const body = new URLSearchParams({
      client: ONURIX_CLIENT,
      key: ONURIX_KEY,
      phone: numero,
      sms: mensaje,
    });

    const res = await fetch('https://www.onurix.com/api/v1/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: body.toString(),
    });

    const text = await res.text();
    console.log(`Respuesta para ${numero}:`, text);
  }
}

main().catch(console.error);
