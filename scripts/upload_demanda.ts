import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import db from '../lib/db';
import { runSeed } from '../lib/seed';

// Aumentamos el límite de celdas por defecto si los Excels son muy grandes
// (Eliminado xlsx.set_fs porque Node ya usa fs por defecto)

// Mapeo de archivos y su tipo de examen
const FILES_TO_PROCESS = [
  { filename: 'DEMANDA_INDUCIDA_MAMOGRAFIA.xlsx', type: 'MAMOGRAFIA' },
  { filename: 'DEMANDA_INDUCIDA_PSA.xlsx', type: 'PSA' },
  { filename: 'DEMANDA_INDUCIDA_CITOLOGIA.xlsx', type: 'CITOLOGIA' }
];

const BATCH_SIZE = 500;

// Utilidad para limpiar teléfonos
function cleanPhone(phone: any): string {
  if (!phone) return '';
  const str = String(phone);
  // Dejamos solo números
  const cleaned = str.replace(/\D/g, '');
  return cleaned;
}

// Utilidad para extraer columnas base y empaquetar el resto
function processRow(row: any, type: string) {
  // Extraemos las columnas que sabemos que existen siempre
  const baseData = {
    tipo_examen: type,
    contrato_afil: row['Contrato_afil']?.toString() || '',
    serial_bdua: row['SERIAL BDUA']?.toString() || '',
    tipo_identificacion: row['TIPO DE IDENTIFICACION']?.toString() || '',
    numero_identificacion: row['NUMERO DE IDENTIFICACION']?.toString() || '',
    llave: row['LLAVE']?.toString() || '',
    nombres: `${row['1ER NOMBRE'] || ''} ${row['2DO NOMBRE'] || ''}`.trim(),
    apellidos: `${row['1ER APELLIDO'] || ''} ${row['2DO APELLIDO'] || ''}`.trim(),
    fecha_nacimiento: row['FECHA DE NACIMIENTO']?.toString() || '',
    edad: row['EDAD']?.toString() || '',
    grupo_edad: row['GRUPO DE EDAD']?.toString() || '',
    sexo: row['SEXO']?.toString() || '',
    etnia: row['ETNIA']?.toString() || '',
    regimen_afiliacion: row['REGIMEN DE AFILIACION']?.toString() || '',
    estado_afiliacion: row['ESTADO DE AFILIACION']?.toString() || '',
    telefonos: cleanPhone(row['TELEFONOS']),
    email: row['EMAIL']?.toString() || '',
    zona: row['ZONA']?.toString() || '',
    municipio: row['MUNICIPIO']?.toString() || '',
    subregion: row['SUBREGION']?.toString() || '',
    direccion_residencia: row['DIRECCION DE RESIDENCIA']?.toString() || '',
    barrio_residencia: row['BARRIO DE RESIDENCIA']?.toString() || '',
    observaciones_demanda_inducida: row['TAMIZAJE - OBSERVACIONES DEMANDA INDUCIDA']?.toString() || '',
    observacion: row['OBSERVACION']?.toString() || ''
  };

  // Extraemos las columnas específicas dinámicamente eliminando las base
  const specificData: Record<string, any> = {};
  const baseKeys = [
    'Contrato_afil', 'SERIAL BDUA', 'TIPO DE IDENTIFICACION', 'NUMERO DE IDENTIFICACION', 'LLAVE',
    '1ER NOMBRE', '2DO NOMBRE', '1ER APELLIDO', '2DO APELLIDO',
    'FECHA DE NACIMIENTO', 'EDAD', 'GRUPO DE EDAD', 'SEXO', 'ETNIA',
    'REGIMEN DE AFILIACION', 'ESTADO DE AFILIACION',
    'TELEFONOS', 'EMAIL', 'ZONA', 'MUNICIPIO', 'SUBREGION', 'DIRECCION DE RESIDENCIA', 'BARRIO DE RESIDENCIA',
    'TAMIZAJE - OBSERVACIONES DEMANDA INDUCIDA', 'OBSERVACION'
  ];

  for (const key of Object.keys(row)) {
    if (!baseKeys.includes(key)) {
      specificData[key] = row[key];
    }
  }

  return { baseData, specificData };
}

async function uploadFile(filepath: string, type: string) {
  console.log(`⏳ Leyendo archivo ${path.basename(filepath)}...`);
  const workbook = xlsx.readFile(filepath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convertimos a JSON. defval: '' previene undefined en celdas vacías
  const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  console.log(`✅ Archivo leido. Procesando ${rows.length} filas...`);

  const sql = `
    INSERT INTO demanda_inducida (
      tipo_examen, contrato_afil, serial_bdua, tipo_identificacion, numero_identificacion, llave,
      nombres, apellidos, fecha_nacimiento, edad, grupo_edad, sexo, etnia,
      regimen_afiliacion, estado_afiliacion, telefonos, email, zona, municipio, subregion,
      direccion_residencia, barrio_residencia, observaciones_demanda_inducida, observacion,
      datos_especificos
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  let stmts: any[] = [];
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const row: any = rows[i];
    const { baseData, specificData } = processRow(row, type);
    
    stmts.push({
      sql,
      args: [
        baseData.tipo_examen, baseData.contrato_afil, baseData.serial_bdua, baseData.tipo_identificacion,
        baseData.numero_identificacion, baseData.llave, baseData.nombres, baseData.apellidos,
        baseData.fecha_nacimiento, baseData.edad, baseData.grupo_edad, baseData.sexo, baseData.etnia,
        baseData.regimen_afiliacion, baseData.estado_afiliacion, baseData.telefonos, baseData.email,
        baseData.zona, baseData.municipio, baseData.subregion, baseData.direccion_residencia,
        baseData.barrio_residencia, baseData.observaciones_demanda_inducida, baseData.observacion,
        JSON.stringify(specificData)
      ]
    });

    // Insertar en lote
    if (stmts.length >= BATCH_SIZE) {
      await db.batch(stmts);
      totalInserted += stmts.length;
      stmts = [];
      process.stdout.write(`\r🚀 Insertadas ${totalInserted} / ${rows.length} filas.`);
    }
  }

  // Insertar sobrantes
  if (stmts.length > 0) {
    await db.batch(stmts);
    totalInserted += stmts.length;
    process.stdout.write(`\r🚀 Insertadas ${totalInserted} / ${rows.length} filas.`);
  }

  console.log(`\n🎉 Archivo ${path.basename(filepath)} (${type}) completado.\n`);
}

async function main() {
  try {
    // 1. Aseguramos que la tabla exista ejecutando el seed (o podemos crearla directamente)
    console.log('🌱 Asegurando schema de la base de datos...');
    await runSeed();
    
    // 2. Procesamos cada archivo
    const infoDir = path.resolve(process.cwd(), 'Informacion');
    for (const fileDef of FILES_TO_PROCESS) {
      const filepath = path.join(infoDir, fileDef.filename);
      if (fs.existsSync(filepath)) {
        await uploadFile(filepath, fileDef.type);
      } else {
        console.warn(`⚠️ Advertencia: El archivo ${fileDef.filename} no se encontró en ${infoDir}`);
      }
    }

    console.log('✅ Todos los archivos procesados exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ocurrió un error durante la importación:', error);
    process.exit(1);
  }
}

main();
