/**
 * lib/db.ts — Cliente libSQL compatible con Turso (prod) y SQLite local (dev)
 *
 * En desarrollo: usa archivo local  →  TURSO_DATABASE_URL=file:./agendamiento.db
 * En producción: usa Turso remoto   →  TURSO_DATABASE_URL=libsql://...turso.io
 */
import { createClient, type Client } from '@libsql/client';

function getClient(): Client {
  const url = process.env.TURSO_DATABASE_URL ?? 'file:./agendamiento.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return createClient({ url, authToken });
}

// Singleton para evitar múltiples conexiones en hot-reload de desarrollo
const globalForDb = globalThis as typeof globalThis & { _libsql?: Client };
const client: Client = globalForDb._libsql ?? getClient();
if (process.env.NODE_ENV !== 'production') globalForDb._libsql = client;

// ─── Wrapper con API similar a node:sqlite pero async ─────────────────────
export const db = {
  /** Ejecuta SQL crudo (DDL, PRAGMAs, múltiples sentencias separadas por ;) */
  async exec(sql: string): Promise<void> {
    const stmts = sql
      .split(';')
      .map(s => s.trim())
      .filter(Boolean);
    if (stmts.length === 0) return;
    await client.batch(stmts.map(s => ({ sql: s, args: [] })), 'write');
  },

  /** Prepara una consulta y devuelve helpers .get() / .all() / .run() */
  prepare(sql: string) {
    return {
      /** Retorna la primera fila o null */
      async get(...args: any[]): Promise<Record<string, unknown> | null> {
        const r = await client.execute({ sql, args });
        return (r.rows[0] as Record<string, unknown>) ?? null;
      },
      /** Retorna todas las filas */
      async all(...args: any[]): Promise<Record<string, unknown>[]> {
        const r = await client.execute({ sql, args });
        return r.rows as Record<string, unknown>[];
      },
      /** Ejecuta INSERT / UPDATE / DELETE */
      async run(...args: any[]): Promise<{ lastInsertRowid: number; changes: number }> {
        const r = await client.execute({ sql, args });
        return {
          lastInsertRowid: Number(r.lastInsertRowid ?? 0),
          changes: r.rowsAffected,
        };
      },
    };
  },

  /** Ejecuta un batch de sentencias en una sola transacción */
  async batch(stmts: { sql: string; args?: any[] }[]): Promise<void> {
    await client.batch(stmts as any, 'write');
  },
};

export default db;
