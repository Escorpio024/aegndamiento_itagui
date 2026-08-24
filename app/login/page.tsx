'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

const TIPOS_DOC = ['CC','TI','CE','PP','PPT','RC','SC'];
const REGIMENES = ['CONTRIBUTIVO','SUBSIDIADO'];

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const toast  = useToast();
  const [tab, setTab]     = useState<'login'|'register'>(params.get('tab') === 'register' ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Login form
  const [loginData, setLoginData] = useState({ documento: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [checkingDoc, setCheckingDoc] = useState(false);
  // Register form
  const [regData, setRegData] = useState({
    nombre:'', documento:'', tipoDoc:'CC', telefono:'', email:'', regimen:'CONTRIBUTIVO'
  });
  const [checkingRegDoc, setCheckingRegDoc] = useState(false);

  // Al salir del campo cédula, verificamos si necesita contraseña personalizada
  const handleDocumentoBlur = async () => {
    const doc = loginData.documento.trim();
    if (!doc) return;
    setCheckingDoc(true);
    try {
      const r = await fetch(`/api/auth/login?documento=${encodeURIComponent(doc)}`);
      const data = await r.json();
      if (data.needsPassword) {
        setShowPassword(true);
      } else {
        setShowPassword(false);
      }
    } catch { /* silencioso */ }
    finally { setCheckingDoc(false); }
  };

  // Autocompletar datos de registro si el paciente existe en demanda_inducida
  const handleRegDocumentoBlur = async () => {
    const doc = regData.documento.trim();
    if (!doc) return;
    setCheckingRegDoc(true);
    try {
      const r = await fetch(`/api/auth/check-document?documento=${encodeURIComponent(doc)}`);
      const data = await r.json();
      if (data.found && data.data) {
        setRegData(prev => ({
          ...prev,
          nombre: prev.nombre || data.data.nombre,
          tipoDoc: data.data.tipoDoc || prev.tipoDoc,
          telefono: prev.telefono || data.data.telefono,
          email: prev.email || data.data.email,
          regimen: data.data.regimen || prev.regimen
        }));
        toast('Datos encontrados. Por favor verifica que sean correctos.', 'info');
      }
    } catch { /* silencioso */ }
    finally { setCheckingRegDoc(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      // Si no se muestra el campo contraseña, se usa la cédula como contraseña
      const payload = {
        documento: loginData.documento,
        password: showPassword ? loginData.password : loginData.documento,
      };
      const r = await fetch('/api/auth/login', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      toast('¡Bienvenido! Sesión iniciada.', 'success');
      if (data.user?.rol === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = params.get('redirect') || '/solicitar-cita';
      }
    } catch { setError('Error de conexión. Intente nuevamente.'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      // La contraseña por defecto es el número de documento
      const payload = { ...regData, password: regData.documento };
      const r = await fetch('/api/auth/register', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      toast('¡Cuenta creada! Tu contraseña inicial es tu número de cédula.', 'success');
      if (data.user?.rol === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = params.get('redirect') || '/solicitar-cita';
      }
    } catch { setError('Error de conexión.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        {/* Logo */}
        <div className="auth-logo">
          <img src="/logo.png" alt="Aurora Agenda Logo" style={{ width: 42, height: 42, objectFit: 'contain' }} />
          <span>Aurora <em style={{ fontStyle:'normal', background:'var(--grad)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Agenda</em></span>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab${tab==='login'?' active':''}`}    onClick={() => { setTab('login');    setError(''); }}>Iniciar sesión</button>
          <button className={`auth-tab${tab==='register'?' active':''}`} onClick={() => { setTab('register'); setError(''); }}>Registrarse</button>
        </div>

        {/* Error */}
        {error && <div className="alert alert-error" style={{ marginBottom:16 }}><span>⚠️</span> {error}</div>}

        {/* ─── LOGIN ─────────────────────────────────────── */}
        {tab === 'login' && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Número de cédula <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <input type="text" className="form-control" placeholder="Ej: 43062876"
                  value={loginData.documento}
                  onChange={e => { setLoginData(d => ({ ...d, documento: e.target.value })); setShowPassword(false); }}
                  onBlur={handleDocumentoBlur}
                  required autoFocus />
                {checkingDoc && (
                  <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:'0.75rem', color:'var(--text-3)' }}>
                    verificando...
                  </span>
                )}
              </div>
            </div>

            {showPassword && (
              <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                <label className="form-label">Contraseña <span className="req">*</span></label>
                <input type="password" className="form-control" placeholder="Tu contraseña"
                  value={loginData.password}
                  onChange={e => setLoginData(d => ({ ...d, password: e.target.value }))}
                  required={showPassword} autoFocus />
              </div>
            )}

            <button type="submit" className={`btn btn-primary btn-block btn-lg${loading?' btn-loading':''}`} disabled={loading}>
              {loading ? <><span className="spinner spinner-sm" /> Iniciando sesión...</> : '→ Iniciar sesión'}
            </button>

            {!showPassword && (
              <p style={{ fontSize:'0.78rem', color:'var(--text-3)', margin:'-4px 0 8px', textAlign:'center' }}>
                Ingresa tu cédula y haz clic en el botón para continuar
              </p>
            )}
          </form>
        )}

        {/* ─── REGISTER ──────────────────────────────────── */}
        {tab === 'register' && (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Nombre completo <span className="req">*</span></label>
              <input type="text" className="form-control" placeholder="Juan García López"
                value={regData.nombre} onChange={e => setRegData(d => ({ ...d, nombre:e.target.value }))} required />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tipo de documento <span className="req">*</span></label>
                <select className="form-control" value={regData.tipoDoc} onChange={e => setRegData(d => ({ ...d, tipoDoc:e.target.value }))}>
                  {TIPOS_DOC.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">N° documento <span className="req">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input type="text" className="form-control" placeholder="1234567890"
                    value={regData.documento} 
                    onChange={e => setRegData(d => ({ ...d, documento:e.target.value }))}
                    onBlur={handleRegDocumentoBlur}
                    required />
                  {checkingRegDoc && (
                    <span style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', fontSize:'0.75rem', color:'var(--text-3)' }}>
                      buscando...
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Teléfono <span className="req">*</span></label>
                <input type="tel" className="form-control" placeholder="3001234567"
                  value={regData.telefono} onChange={e => setRegData(d => ({ ...d, telefono:e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Régimen</label>
                <select className="form-control" value={regData.regimen} onChange={e => setRegData(d => ({ ...d, regimen:e.target.value }))}>
                  {REGIMENES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input type="email" className="form-control" placeholder="correo@ejemplo.com (opcional)"
                value={regData.email} onChange={e => setRegData(d => ({ ...d, email:e.target.value }))} />
            </div>
            <div className="alert" style={{ background:'rgba(var(--accent-rgb),0.08)', border:'1px solid rgba(var(--accent-rgb),0.2)', borderRadius:8, padding:'10px 14px', fontSize:'0.82rem', color:'var(--text-2)', marginBottom:12 }}>
              🔑 Tu contraseña inicial será tu número de cédula. Podrás cambiarla desde tu perfil.
            </div>
            <button type="submit" className={`btn btn-primary btn-block btn-lg${loading?' btn-loading':''}`} disabled={loading}>
              {loading ? <><span className="spinner spinner-sm" /> Creando cuenta...</> : '✓ Crear cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px 20px', textAlign: 'center' }}>Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}
