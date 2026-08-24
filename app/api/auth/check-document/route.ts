import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const documento = url.searchParams.get('documento');

  if (!documento) {
    return NextResponse.json({ error: 'Falta el documento' }, { status: 400 });
  }

  try {
    // Buscar en demanda_inducida
    const paciente = await db.prepare(
      'SELECT nombres, apellidos, tipo_identificacion, telefonos, email, regimen_afiliacion FROM demanda_inducida WHERE numero_identificacion = ?'
    ).get(documento.trim()) as any;

    if (!paciente) {
      return NextResponse.json({ found: false });
    }

    // Extraer celular válido
    let telefonoLimpio = '';
    if (paciente.telefonos) {
      const matches = paciente.telefonos.match(/3\d{9}/g);
      if (matches && matches.length > 0) {
        telefonoLimpio = matches[0]; // Usar el primer celular válido
      }
    }

    // Mapear tipo de documento (de demanda_inducida al formato de la web si es distinto, ej CC -> CC)
    let tipoDoc = 'CC';
    if (paciente.tipo_identificacion) {
      const t = paciente.tipo_identificacion.toUpperCase();
      if (['CC', 'TI', 'CE', 'PP', 'PPT', 'RC', 'SC'].includes(t)) {
        tipoDoc = t;
      }
    }

    let regimen = 'CONTRIBUTIVO';
    if (paciente.regimen_afiliacion && paciente.regimen_afiliacion.toUpperCase().includes('SUBSIDIADO')) {
      regimen = 'SUBSIDIADO';
    }

    const nombreCompleto = `${paciente.nombres || ''} ${paciente.apellidos || ''}`.trim();

    return NextResponse.json({
      found: true,
      data: {
        nombre: nombreCompleto,
        tipoDoc: tipoDoc,
        telefono: telefonoLimpio,
        email: paciente.email || '',
        regimen: regimen
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
