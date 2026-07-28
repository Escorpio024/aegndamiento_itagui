'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

const TIPOS_DOC = ['CC','TI','CE','PP','PPT','RC','SC'];
const REGIMENES = ['CONTRIBUTIVO','SUBSIDIADO'];

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const toast  = useToast();
  const [tab, setTab]     = useState<'login'|'register'>(params.get('tab') === 'register' ? 'register' : 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Login form
  const [loginData, setLoginData]   = useState({ email:'', password:'' });
  // Register form
  const [regData, setRegData] = useState({
    nombre:'', documento:'', tipoDoc:'CC', telefono:'', email:'', password:'', regimen:'CONTRIBUTIVO'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      toast('¡Bienvenido! Sesión iniciada.', 'success');
      if (data.user?.rol === 'admin') {
        router.push('/admin');
      } else {
        router.push(params.get('redirect') || '/solicitar-cita');
      }
      router.refresh();
    } catch { setError('Error de conexión. Intente nuevamente.'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/register', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(regData),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      toast('¡Cuenta creada exitosamente!', 'success');
      if (data.user?.rol === 'admin') {
        router.push('/admin');
      } else {
        router.push(params.get('redirect') || '/solicitar-cita');
      }
      router.refresh();
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
              <label className="form-label">Correo electrónico <span className="req">*</span></label>
              <input type="email" className="form-control" placeholder="correo@ejemplo.com"
                value={loginData.email} onChange={e => setLoginData(d => ({ ...d, email:e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña <span className="req">*</span></label>
              <input type="password" className="form-control" placeholder="••••••••"
                value={loginData.password} onChange={e => setLoginData(d => ({ ...d, password:e.target.value }))} required />
            </div>
            <button type="submit" className={`btn btn-primary btn-block btn-lg${loading?' btn-loading':''}`} disabled={loading}>
              {loading ? <><span className="spinner spinner-sm" /> Iniciando sesión...</> : '→ Iniciar sesión'}
            </button>
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
                <input type="text" className="form-control" placeholder="1234567890"
                  value={regData.documento} onChange={e => setRegData(d => ({ ...d, documento:e.target.value }))} required />
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
              <label className="form-label">Correo electrónico <span className="req">*</span></label>
              <input type="email" className="form-control" placeholder="correo@ejemplo.com"
                value={regData.email} onChange={e => setRegData(d => ({ ...d, email:e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña <span className="req">*</span></label>
              <input type="password" className="form-control" placeholder="Mínimo 6 caracteres"
                value={regData.password} onChange={e => setRegData(d => ({ ...d, password:e.target.value }))} required minLength={6} />
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
