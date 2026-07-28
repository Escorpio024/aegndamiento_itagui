/**
 * lib/seed.ts — Datos iniciales: admin, sedes, doctores, procedimientos
 */
import db from './db';
import { hashPassword } from './crypto';

export function runSeed() {
  // ─── Admin ────────────────────────────────────────────────────
  const adminExists = db.prepare("SELECT id FROM usuarios WHERE email = 'admin@itagui.gov.co'").get();
  if (!adminExists) {
    db.prepare(
      `INSERT INTO usuarios (nombre, documento, tipo_doc, telefono, email, password, rol)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('Administrador Itagüi', '0000000001', 'CC', '3001234567',
          'admin@itagui.gov.co', hashPassword('Admin1234!'), 'admin');
    console.log('✅ Admin creado');
  }

  // ─── Limpiar posibles duplicados de sedes y doctores ──────────
  db.exec(`
    DELETE FROM doctores WHERE id NOT IN (SELECT MIN(id) FROM doctores GROUP BY nombre);
    DELETE FROM sedes WHERE id NOT IN (SELECT MIN(id) FROM sedes GROUP BY nombre);
  `);

  // ─── Sedes ────────────────────────────────────────────────────
  const sedes = [
    { nombre: 'Sede Central Itagüi',     direccion: 'Calle 50 #45-23, Centro',       ciudad: 'Itagüi', telefono: '3609000' },
    { nombre: 'Sede El Rosario',          direccion: 'Carrera 55 #67-10, El Rosario', ciudad: 'Itagüi', telefono: '3609100' },
    { nombre: 'Sede La Independencia',    direccion: 'Av. Guayabal #38-15',            ciudad: 'Itagüi', telefono: '3609200' },
  ];
  for (const s of sedes) {
    const exists = db.prepare('SELECT id FROM sedes WHERE nombre = ?').get(s.nombre);
    if (!exists) {
      db.prepare('INSERT INTO sedes (nombre, direccion, ciudad, telefono) VALUES (?, ?, ?, ?)')
        .run(s.nombre, s.direccion, s.ciudad, s.telefono);
    }
  }

  // ─── Doctores ─────────────────────────────────────────────────
  const doctores = [
    { nombre: 'Dr. Carlos Medina Ruiz',     especialidad: 'Radiología e Imágenes Diagnósticas' },
    { nombre: 'Dra. María López Cifuentes', especialidad: 'Tomografía Computada' },
    { nombre: 'Dr. Andrés Vélez Torres',    especialidad: 'Radiología e Imágenes Diagnósticas' },
  ];
  for (const d of doctores) {
    const exists = db.prepare('SELECT id FROM doctores WHERE nombre = ?').get(d.nombre);
    if (!exists) {
      db.prepare('INSERT INTO doctores (nombre, especialidad) VALUES (?, ?)').run(d.nombre, d.especialidad);
    }
  }

  // ─── Procedimientos (29 del Excel) ────────────────────────────
  const procs = [
    { cups: '879111', nombre: 'Tomografía Computada de Cráneo Simple',                                         contraste: 'Simple' },
    { cups: '879301', nombre: 'Tomografía Computada de Tórax',                                                 contraste: 'Simple' },
    { cups: '879420', nombre: 'Tomografía Computada de Abdomen y Pelvis (Abdomen Total)',                       contraste: 'Simple' },
    { cups: '879430', nombre: 'Tomografía Computada de Vías Urinarias [UROTC]',                                contraste: 'Simple' },
    { cups: '879131', nombre: 'Tomografía Computada de Senos Paranasales o Cara',                              contraste: 'Simple' },
    { cups: '879201', nombre: 'Tomografía Computada de Columna (Cervical/Torácico/Lumbar/Sacro)',               contraste: 'Simple' },
    { cups: '879910', nombre: 'Tomografía Computada en Reconstrucción Tridimensional',                         contraste: 'Simple' },
    { cups: '879161', nombre: 'Tomografía Computada de Cuello',                                                contraste: 'Simple' },
    { cups: '879205', nombre: 'Tomografía Computada de Columna - Complemento a Mielografía',                   contraste: 'Simple' },
    { cups: '879113', nombre: 'Tomografía Computada de Cráneo Simple y Contrastada',                           contraste: 'Simple-Contrastada' },
    { cups: '879122', nombre: 'Tomografía Computada de Oído, Peñasco y Conducto Auditivo Interno',             contraste: 'Simple' },
    { cups: '879520', nombre: 'Tomografía Computada de Miembros Inferiores y Articulaciones',                  contraste: 'Simple' },
    { cups: '879112', nombre: 'Tomografía Computada de Cráneo Contrastada',                                    contraste: 'Contrastada' },
    { cups: '879901', nombre: 'Tomografía Computada de Vasos (Angiotomografía)',                               contraste: 'Contrastada' },
    { cups: '879510', nombre: 'Tomografía Computada de Miembros Superiores y Articulaciones',                  contraste: 'Simple' },
    { cups: '879990', nombre: 'Tomografía Computada como Guía para Procedimientos',                            contraste: 'Simple' },
    { cups: '879410', nombre: 'Tomografía Computada de Abdomen Superior',                                      contraste: 'Simple' },
    { cups: '879460', nombre: 'Tomografía Computada de Pelvis',                                                contraste: 'Simple' },
    { cups: '879391', nombre: 'Tomografía Computada de Tórax Extendido al Abdomen Superior con Suprarrenales', contraste: 'Simple' },
    { cups: '879421', nombre: 'Tomografía Computada de Cadera',                                                contraste: 'Simple' },
    { cups: '879141', nombre: 'Tomografía Computada de Maxilares (Estudio Implantología)',                      contraste: 'Simple' },
    { cups: '879150', nombre: 'Tomografía Computada de Articulación Temporomandibular (Bilateral)',             contraste: 'Simple' },
    { cups: '879121', nombre: 'Tomografía Computada de Órbitas',                                               contraste: 'Simple' },
    { cups: '879904', nombre: 'Tomografía de Coherencia Óptica Endovascular (Intravascular)',                  contraste: 'Contrastada' },
    { cups: '879114', nombre: 'Cisternografía por Tomografía Computada (TC)',                                  contraste: 'Contrastada' },
    { cups: '879116', nombre: 'Tomografía Computada de Silla Turca (Hipófisis)',                               contraste: 'Simple' },
    { cups: '879162', nombre: 'Tomografía Computada de Laringe',                                               contraste: 'Simple' },
    { cups: '879411', nombre: 'Tomografía Computada de Intestino [EnterotTC]',                                 contraste: 'Contrastada' },
    { cups: '879905', nombre: 'Tomografía Computada Ósea de Cuerpo Entero',                                   contraste: 'Simple' },
  ];

  const insertProc = db.prepare('INSERT OR IGNORE INTO procedimientos (cups, nombre, modalidad, contraste) VALUES (?, ?, ?, ?)');
  for (const p of procs) {
    insertProc.run(p.cups, p.nombre, 'IMAGENES_DIAGNOSTICAS', p.contraste);
  }
  // ─── Horarios de muestra para hoy y los próximos 14 días ────
  const horariosCount = db.prepare("SELECT COUNT(*) as c FROM horarios").get() as { c: number };
  if (horariosCount.c === 0) {
    const insertHorario = db.prepare(
      'INSERT OR IGNORE INTO horarios (sede_id, doctor_id, fecha, hora_inicio, hora_fin, disponible) VALUES (?, ?, ?, ?, ?, 1)'
    );
    const sedesList = db.prepare('SELECT id FROM sedes').all() as { id: number }[];
    const doctoresList = db.prepare('SELECT id FROM doctores').all() as { id: number }[];

    if (sedesList.length > 0 && doctoresList.length > 0) {
      const hoy = new Date();
      db.exec('BEGIN TRANSACTION;');
      try {
        for (let idx = 0; idx < 15; idx++) {
          const d = new Date(hoy);
          d.setDate(hoy.getDate() + idx);
          const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const horas = [
            ['08:00', '08:30'], ['08:30', '09:00'], ['09:00', '09:30'], ['09:30', '10:00'],
            ['10:00', '10:30'], ['10:30', '11:00'], ['11:00', '11:30'], ['11:30', '12:00'],
            ['14:00', '14:30'], ['14:30', '15:00'], ['15:00', '15:30'], ['15:30', '16:00'],
            ['16:00', '16:30'], ['16:30', '17:00'],
          ];
          for (let sIdx = 0; sIdx < sedesList.length; sIdx++) {
            const sedeId = sedesList[sIdx].id;
            const doctorId = doctoresList[sIdx % doctoresList.length].id;
            for (const [hInicio, hFin] of horas) {
              insertHorario.run(sedeId, doctorId, fechaStr, hInicio, hFin);
            }
          }
        }
        db.exec('COMMIT;');
        console.log('✅ Horarios de muestra creados');
      } catch (e) {
        db.exec('ROLLBACK;');
        console.error('Error al generar horarios:', e);
      }
    }
  }

  console.log('🌱 Seed completado');
}

