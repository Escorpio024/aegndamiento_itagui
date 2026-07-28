import Link from 'next/link';
import HeroParticles from '@/components/HeroParticles';
import db from '@/lib/db';
import { runSeed } from '@/lib/seed';

// Server Component — queries DB directly
function getProcedimientos() {
  try {
    runSeed();
    return db.prepare('SELECT * FROM procedimientos WHERE activo=1 ORDER BY nombre').all();
  } catch { return []; }
}

function getSedes() {
  try {
    runSeed();
    return db.prepare('SELECT * FROM sedes WHERE activa = 1 ORDER BY nombre').all();
  } catch { return []; }
}

const PROC_ICONS: Record<string, string> = {
  craneo:'🧠', torax:'🫁', abdomen:'🫄', urinarias:'💧', senos:'👃',
  columna:'🦴', cuello:'🫴', oido:'👂', miembros:'🦵', vasos:'🩸',
  pelvis:'🦴', cadera:'🦴', maxilares:'🦷', orbitas:'👁️', laringe:'🗣️',
  intestino:'🫄', osea:'🦴',
};

function getProcIcon(nombre: string): string {
  const n = nombre.toLowerCase();
  for (const [k, v] of Object.entries(PROC_ICONS)) {
    if (n.includes(k)) return v;
  }
  return '🔬';
}

function BadgeContraste({ c }: { c: string }) {
  if (c === 'Simple') return <span className="badge badge-simple">Simple</span>;
  if (c === 'Contrastada') return <span className="badge badge-contrast">Contrastada</span>;
  return <span className="badge badge-sc">S+C</span>;
}

export default async function HomePage() {
  const [procedimientos, sedes] = await Promise.all([getProcedimientos(), getSedes()]);

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg" />
        <HeroParticles />
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">🏥 Municipio de Itagüi · Radiología Digital</div>
            <h1 className="hero-title">
              Agenda tu cita de<br />
              <span className="gradient-text">Imágenes Diagnósticas</span><br />
              en línea
            </h1>
            <p className="hero-sub">
              Sistema oficial de agendamiento para imágenes diagnósticas computarizadas.
              Selecciona tu sede, elige el horario disponible y confirma tu cita
              en menos de 5 minutos.
            </p>
            <div className="hero-actions">
              <Link href="/solicitar-cita" className="btn btn-primary btn-lg">📅 Solicitar Cita Ahora</Link>
              <a href="#procedimientos" className="btn btn-outline btn-lg">Ver Procedimientos</a>
            </div>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-value">{procedimientos.length || 29}</div>
                <div className="hero-stat-label">Tipos de Imágenes Diagnósticas</div>
              </div>
              <div>
                <div className="hero-stat-value">{sedes.length || 3}</div>
                <div className="hero-stat-label">Sedes Disponibles</div>
              </div>
              <div>
                <div className="hero-stat-value">24/7</div>
                <div className="hero-stat-label">Agendamiento en línea</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ─────────────────────────────── */}
      <section className="section" style={{ background: 'var(--bg-1)' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">✨ ¿Cómo funciona?</div>
            <h2 className="section-title">Simple, rápido y seguro</h2>
            <p className="section-desc">Agenda tus imágenes diagnósticas en 3 sencillos pasos desde cualquier dispositivo.</p>
          </div>
          <div className="grid-3">
            {[
              { icon:'📝', step:'1. Regístrate', desc:'Crea tu cuenta con tu documento, correo y teléfono. Solo toma 1 minuto.' },
              { icon:'📅', step:'2. Elige tu cita', desc:'Selecciona el tipo de imágenes diagnósticas, la sede más cercana y el horario disponible.' },
              { icon:'✅', step:'3. Confirma', desc:'Revisa los detalles y confirma. Consulta tus citas en cualquier momento.' },
            ].map(({ icon, step, desc }) => (
              <div key={step} className="card" style={{ textAlign:'center', padding:'40px 28px' }}>
                <div style={{ fontSize:48, marginBottom:20 }}>{icon}</div>
                <h3 style={{ marginBottom:12 }}>{step}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCEDIMIENTOS ────────────────────────────── */}
      <section className="section" id="procedimientos">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">🫁 Procedimientos</div>
            <h2 className="section-title">Tipos de Imágenes Diagnósticas</h2>
            <p className="section-desc">29 tipos de imágenes diagnósticas disponibles para todas las necesidades diagnósticas.</p>
          </div>
          <div className="grid-3">
            {procedimientos.map((p: any) => (
              <div key={p.id} className="procedure-card">
                <div className="proc-icon">{getProcIcon(p.nombre)}</div>
                <div className="proc-name">{p.nombre}</div>
                <BadgeContraste c={p.contraste} />
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:36 }}>
            <Link href="/solicitar-cita" className="btn btn-primary">Solicitar un Procedimiento →</Link>
          </div>
        </div>
      </section>

      {/* ── SEDES ─────────────────────────────────────── */}
      <section className="section" id="sedes" style={{ background:'var(--bg-1)' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">📍 Sedes</div>
            <h2 className="section-title">Nuestras Ubicaciones</h2>
            <p className="section-desc">Encuentra la sede más cercana en el municipio de Itagüi.</p>
          </div>
          <div className="grid-3">
            {sedes.map((s: any) => (
              <div key={s.id} className="sede-card">
                <div className="sede-icon">🏥</div>
                <div>
                  <div className="sede-name">{s.nombre}</div>
                  <div className="sede-detail" style={{ marginTop:8 }}>📍 {s.direccion}</div>
                  <div className="sede-detail">🏙️ {s.ciudad}</div>
                  {s.telefono && <div className="sede-detail">📞 {s.telefono}</div>}
                </div>
                <Link href="/solicitar-cita" className="btn btn-outline btn-sm" style={{ alignSelf:'flex-start', marginTop:8 }}>
                  Agendar aquí →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INFO STRIP ─────────────────────────────────── */}
      <section className="section-sm" style={{ background:'linear-gradient(135deg,rgba(0,212,170,.07),rgba(79,172,254,.05))' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:32, textAlign:'center' }}>
            {[
              { icon:'⏰', title:'Duración de cita', desc:'30 minutos por turno en promedio' },
              { icon:'📄', title:'Autorización médica', desc:'Traer orden médica vigente el día de la cita' },
              { icon:'🎽', title:'Preparación', desc:'Ayuno de 4h para estudios con contraste' },
              { icon:'🚑', title:'Urgencias', desc:'Línea de urgencias: 3609000' },
            ].map(({ icon, title, desc }) => (
              <div key={title}>
                <div style={{ fontSize:36, marginBottom:8 }}>{icon}</div>
                <h4>{title}</h4>
                <p style={{ fontSize:'.87rem', marginTop:6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <div className="nav-logo">
                <img src="/logo.png" alt="Aurora Agenda Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <span style={{ fontWeight:800, fontSize:'1.1rem' }}>
                  Aurora <em style={{ fontStyle:'normal', background:'var(--grad)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Agenda</em>
                </span>
              </div>
              <p>Sistema oficial de agendamiento de imágenes diagnósticas computarizadas para el municipio de Itagüi, Antioquia.</p>
            </div>
            <div className="footer-col">
              <h5>Navegación</h5>
              <ul>
                <li><Link href="/">Inicio</Link></li>
                <li><Link href="/solicitar-cita">Solicitar Cita</Link></li>
                <li><Link href="/mis-citas">Mis Citas</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Información</h5>
              <ul>
                <li><a href="#">Régimen Contributivo</a></li>
                <li><a href="#">Régimen Subsidiado</a></li>
                <li><a href="#">Contacto</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2024 Aurora Agenda Itagüi — Todos los derechos reservados</span>
            <span>Hecho con <em style={{ color:'var(--teal)', fontStyle:'normal' }}>♥</em> para Itagüi</span>
          </div>
        </div>
      </footer>
    </>
  );
}
