'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

interface User {
  id: number;
  nombre: string;
  documento: string;
  tipo_doc: string;
  telefono: string;
  email: string;
  rol: string;
  regimen: string | null;
}

export default function PerfilPage() {
  const router = useRouter();
  const toast  = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(u => {
        if (!u) { router.push('/login?redirect=/perfil'); return; }
        setUser(u);
        setLoading(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.'); return;
    }
    if (form.newPassword.length < 6) {
      setError('La nueva contraseña debe tener mínimo 6 caracteres.'); return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      setSuccess('¡Contraseña actualizada exitosamente!');
      toast('Contraseña actualizada ✓', 'success');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '100px 20px', textAlign: 'center', color: 'var(--text-3)' }}>Cargando perfil...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80, paddingBottom: 60, background: 'var(--bg-0)' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
            background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, boxShadow: '0 4px 24px rgba(var(--accent-rgb),0.35)'
          }}>👤</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Mi Perfil</h1>
          <p style={{ color: 'var(--text-3)', marginTop: 6 }}>Administra tu información personal</p>
        </div>

        {/* Info Card */}
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Información de la cuenta</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { label: 'Nombre completo', value: user?.nombre },
              { label: 'Tipo de documento', value: user?.tipo_doc },
              { label: 'Número de documento', value: user?.documento },
              { label: 'Teléfono', value: user?.telefono },
              { label: 'Correo electrónico', value: user?.email?.includes('@itagui.local') ? '—' : user?.email },
              { label: 'Régimen', value: user?.regimen ?? '—' },
              { label: 'Rol', value: user?.rol },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>{label}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-1)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>🔑 Cambiar contraseña</h2>

          {error   && <div className="alert alert-error"   style={{ marginBottom: 16 }}><span>⚠️</span> {error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}><span>✓</span> {success}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Contraseña actual <span className="req">*</span></label>
              <input
                type="password" className="form-control" placeholder="Tu contraseña actual"
                value={form.currentPassword}
                onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                required
              />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 4 }}>
                Si nunca la cambiaste, tu contraseña es tu número de cédula.
              </p>
            </div>
            <div className="form-group">
              <label className="form-label">Nueva contraseña <span className="req">*</span></label>
              <input
                type="password" className="form-control" placeholder="Mínimo 6 caracteres"
                value={form.newPassword}
                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                required minLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirmar nueva contraseña <span className="req">*</span></label>
              <input
                type="password" className="form-control" placeholder="Repite la nueva contraseña"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required minLength={6}
              />
            </div>
            <button
              type="submit"
              className={`btn btn-primary btn-block${saving ? ' btn-loading' : ''}`}
              disabled={saving}
              style={{ marginTop: 4 }}
            >
              {saving ? <><span className="spinner spinner-sm" /> Guardando...</> : '→ Actualizar contraseña'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
