import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/crypto';
import { getSession } from '@/lib/auth';

// ─── POST /api/auth/change-password ──────────────────────────────────────
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Todos los campos son requeridos.' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'La nueva contraseña debe tener mínimo 6 caracteres.' }, { status: 400 });
  }

  const user = await db.prepare('SELECT * FROM usuarios WHERE id = ?')
    .get(session.id) as Record<string, unknown> | null;

  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
  }

  if (!verifyPassword(currentPassword, user.password as string)) {
    return NextResponse.json({ error: 'La contraseña actual es incorrecta.' }, { status: 400 });
  }

  await db.prepare('UPDATE usuarios SET password = ? WHERE id = ?')
    .run(hashPassword(newPassword), session.id);

  return NextResponse.json({ ok: true, message: 'Contraseña actualizada exitosamente.' });
}
