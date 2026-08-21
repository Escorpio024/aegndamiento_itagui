import { createClient } from '@libsql/client';

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const db = createClient({ url, authToken });

  await db.execute({
    sql: "UPDATE campanas SET total_destinatarios = 2 WHERE nombre = 'Campaña de Prueba (Solo Teléfonos de Prueba)'",
    args: []
  });

  console.log('Campaña actualizada.');
}

main().catch(console.error);
