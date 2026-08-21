require('dotenv').config({ path: '.env' });

async function main() {
  const { createClient } = require('@libsql/client');
  const db = createClient({ url: process.env.TURSO_DATABASE_URL || 'file:./agendamiento.db' });
  const result = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log(result.rows);
}

main().catch(console.error);
