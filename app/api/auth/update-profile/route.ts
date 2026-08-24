import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { nombre, telefono, email, regimen } = await req.json();

  if (!nombre || !telefono) {
    return NextResponse.json({ error: 'Nombre y teléfono son obligatorios.' }, { status: 400 });
  }

  try {
    // 1. Obtener documento actual del usuario
    const user = await db.prepare('SELECT documento FROM usuarios WHERE id = ?').get(session.id) as any;
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    // 2. Actualizar tabla usuarios
    await db.prepare(
      'UPDATE usuarios SET nombre = ?, telefono = ?, email = ?, regimen = ? WHERE id = ?'
    ).run(nombre.trim(), telefono.trim(), email ? email.trim().toLowerCase() : null, regimen, session.id);

    // 3. Actualizar tabla demanda_inducida si existe
    // Actualizamos telefonos agregando el nuevo si no existe, o reemplazando. Por simplicidad, 
    // y dado que el usuario actualiza su número de contacto actual, lo agregamos a la lista o lo seteamos.
    // Para no perder el histórico en demanda_inducida, vamos a obtener el registro actual.
    const paciente = await db.prepare('SELECT telefonos, email FROM demanda_inducida WHERE numero_identificacion = ?').get(user.documento) as any;
    
    if (paciente) {
      let nuevosTelefonos = paciente.telefonos || '';
      if (!nuevosTelefonos.includes(telefono.trim())) {
        nuevosTelefonos = nuevosTelefonos ? `${nuevosTelefonos}, ${telefono.trim()}` : telefono.trim();
      }
      
      const nuevoEmail = email ? email.trim().toLowerCase() : paciente.email;

      await db.prepare(
        'UPDATE demanda_inducida SET telefonos = ?, email = ? WHERE numero_identificacion = ?'
      ).run(nuevosTelefonos, nuevoEmail, user.documento);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
