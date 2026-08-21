'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User { nombre: string; rol: string; }

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(u => setUser(u));
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const isActive = (href: string) => pathname === href;

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="nav-inner">
        {/* Logo */}
        <Link href="/" className="nav-logo">
          <img src="/logo.png" alt="Aurora Agenda Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span>Aurora <em style={{ fontStyle:'normal', background:'var(--grad)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Agenda</em></span>
        </Link>

        {/* Links */}
        <div className="nav-links">
          <Link href="/"                 className={`nav-link${isActive('/')           ? ' active' : ''}`}>Inicio</Link>
          <Link href="/mis-citas"        className={`nav-link${isActive('/mis-citas')  ? ' active' : ''}`}>Información</Link>
          <Link href="/solicitar-cita"   className={`nav-link${isActive('/solicitar-cita') ? ' active' : ''}`}>Solicitar Cita</Link>
          <a href="#sedes" className="nav-link">Sedes</a>
        </div>

        {/* Actions */}
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user">
                Hola, <strong style={{ color:'var(--text-1)', marginLeft:4 }}>{user.nombre.split(' ')[0]}</strong>
              </span>
              {user.rol === 'admin'
                ? <Link href="/admin" className="btn btn-outline btn-sm">⚙️ Admin</Link>
                : <>
                    <Link href="/mis-citas" className="btn btn-outline btn-sm">📋 Mis Citas</Link>
                    <Link href="/perfil" className="btn btn-outline btn-sm">👤 Perfil</Link>
                  </>}
              <button onClick={logout} className="btn btn-ghost btn-sm">Salir</button>
            </>
          ) : (
            <>
              <Link href="/login"                  className="btn btn-outline btn-sm">Iniciar sesión</Link>
              <Link href="/login?tab=register"     className="btn btn-primary btn-sm">Registrarse</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
