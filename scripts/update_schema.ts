import { runSeed } from '../lib/seed';

async function updateSchema() {
  console.log('Actualizando esquema en la base de datos...');
  await runSeed();
  console.log('Esquema actualizado correctamente.');
  process.exit(0);
}

updateSchema().catch(console.error);
