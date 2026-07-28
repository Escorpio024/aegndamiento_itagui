/**
 * lib/db.ts — SQLite singleton con node:sqlite (Node.js v22+)
 */
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'agendamiento.db');

// Singleton para evitar múltiples conexiones en hot-reload de desarrollo
const globalDb = globalThis as typeof globalThis & { _db?: DatabaseSync };

function createDb(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre     TEXT    NOT NULL,
      documento  TEXT    NOT NULL UNIQUE,
      tipo_doc   TEXT    NOT NULL DEFAULT 'CC',
      telefono   TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      password   TEXT    NOT NULL,
      rol        TEXT    NOT NULL DEFAULT 'paciente',
      regimen    TEXT,
      created_at TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sedes (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre    TEXT NOT NULL,
      direccion TEXT NOT NULL,
      ciudad    TEXT NOT NULL DEFAULT 'Itagüi',
      telefono  TEXT,
      activa    INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS doctores (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre       TEXT NOT NULL,
      especialidad TEXT NOT NULL DEFAULT 'Radiología',
      activo       INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS horarios (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sede_id     INTEGER NOT NULL,
      doctor_id   INTEGER NOT NULL,
      fecha       TEXT    NOT NULL,
      hora_inicio TEXT    NOT NULL,
      hora_fin    TEXT    NOT NULL,
      disponible  INTEGER DEFAULT 1,
      FOREIGN KEY (sede_id)   REFERENCES sedes(id),
      FOREIGN KEY (doctor_id) REFERENCES doctores(id)
    );

    CREATE TABLE IF NOT EXISTS procedimientos (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      cups      TEXT NOT NULL UNIQUE,
      nombre    TEXT NOT NULL,
      modalidad TEXT NOT NULL DEFAULT 'TOMOGRAFIA',
      contraste TEXT NOT NULL DEFAULT 'Simple',
      activo    INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS citas (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id       INTEGER NOT NULL,
      procedimiento_id INTEGER NOT NULL,
      horario_id       INTEGER NOT NULL UNIQUE,
      sede_id          INTEGER NOT NULL,
      estado           TEXT    NOT NULL DEFAULT 'PENDIENTE',
      autorizacion     TEXT,
      observaciones    TEXT,
      created_at       TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (usuario_id)       REFERENCES usuarios(id),
      FOREIGN KEY (procedimiento_id) REFERENCES procedimientos(id),
      FOREIGN KEY (horario_id)       REFERENCES horarios(id),
      FOREIGN KEY (sede_id)          REFERENCES sedes(id)
    );
  `);

  return db;
}

const db: DatabaseSync = globalDb._db ?? createDb();
if (process.env.NODE_ENV !== 'production') globalDb._db = db;

export default db;
