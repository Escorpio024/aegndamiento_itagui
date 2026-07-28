import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

const PROTECTED  = ['/mis-citas', '/solicitar-cita'];
const ADMIN_ONLY = ['/admin'];
const COOKIE     = 'radi_token';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE)?.value;

  const isProtected  = PROTECTED.some(p => pathname.startsWith(p));
  const isAdminRoute = ADMIN_ONLY.some(p => pathname.startsWith(p));

  if (!isProtected && !isAdminRoute) return NextResponse.next();

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  try {
    const payload = verifyToken(token);

    if (isAdminRoute && payload.rol !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Pasar info del usuario en headers (los Server Components pueden leerlos)
    const res = NextResponse.next();
    res.headers.set('x-user-id',  String(payload.id));
    res.headers.set('x-user-rol', payload.rol);
    return res;
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/mis-citas/:path*', '/solicitar-cita/:path*', '/admin/:path*'],
};
