'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

interface Cita {
  id: number; estado: string; autorizacion: string|null; observaciones: string|null;
  procedimiento_nombre: string; cups: string; contraste: string;
  sede_nombre: string; sede_direccion: string; sede_telefono: string|null;
  fecha: string; hora_inicio: string; hora_fin: string;
  doctor_nombre: string; doctor_especialidad: string;
  created_at: string;
}

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE:  'badge-pendiente',
  CONFIRMADA: 'badge-confirmada',
  CANCELADA:  'badge-cancelada',
  COMPLETADA: 'badge-completada',
};
const ESTADO_ICON: Record<string, string> = { PENDIENTE:'🕐', CONFIRMADA:'✅', CANCELADA:'❌', COMPLETADA:'🏁' };

function formatDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' });
}
function dayNum(s: string) { return new Date(s + 'T00:00:00').getDate(); }
function monthAbbr(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('es-CO', { month:'short' }).toUpperCase();
}

export default function MisCitasPage() {
  const toast = useToast();
  const [citas,   setCitas]   = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro,  setFiltro]  = useState('');
  const [canceling, setCanceling] = useState<number|null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/citas').then(r => r.json()).then(d => { setCitas(Array.isArray(d) ? d : []); }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cancelar = async (id: number) => {
    if (!confirm('¿Estás seguro de cancelar esta cita? El horario quedará disponible para otros pacientes.')) return;
    setCanceling(id);
    try {
      const r = await fetch(`/api/citas/${id}`, {
        method:'PATCH', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ estado:'CANCELADA' }),
      });
      const data = await r.json();
      if (!r.ok) { toast(data.error, 'error'); return; }
      toast('Cita cancelada. Horario liberado.', 'success');
      load();
    } catch { toast('Error al cancelar.', 'error'); }
    finally { setCanceling(null); }
  };

  const filtered = citas.filter(c =>
    !filtro || c.estado === filtro
  );

  const stats = {
    total:      citas.length,
    pendiente:  citas.filter(c => c.estado === 'PENDIENTE').length,
    confirmada: citas.filter(c => c.estado === 'CONFIRMADA').length,
    cancelada:  citas.filter(c => c.estado === 'CANCELADA').length,
  };

  return (
    <div className="mis-citas-page">
      <div className="container">
        {/* Header */}
        <div className="citas-header">
          <div>
            <h1>Mis Citas</h1>
            <p style={{ marginTop:6 }}>Consulta y gestiona todas tus citas de imágenes diagnósticas</p>
          </div>
          <Link href="/solicitar-cita" className="btn btn-primary">+ Nueva Cita</Link>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom:32 }}>
          <div className="stat-card"><div className="stat-icon blue">📋</div><div><div className="stat-value">{stats.total}</div><div className="stat-label">Total Citas</div></div></div>
          <div className="stat-card"><div className="stat-icon warn">🕐</div><div><div className="stat-value">{stats.pendiente}</div><div className="stat-label">Pendientes</div></div></div>
          <div className="stat-card"><div className="stat-icon succ">✅</div><div><div className="stat-value">{stats.confirmada}</div><div className="stat-label">Confirmadas</div></div></div>
          <div className="stat-card"><div className="stat-icon err">❌</div><div><div className="stat-value">{stats.cancelada}</div><div className="stat-label">Canceladas</div></div></div>
        </div>

        {/* Filters */}
        <div className="flex gap-2" style={{ marginBottom:24, flexWrap:'wrap' }}>
          {['', 'PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`btn btn-sm ${filtro === f ? 'btn-primary' : 'btn-outline'}`}>
              {f || 'Todas'} {f && stats[f.toLowerCase() as keyof typeof stats] !== undefined ? `(${stats[f.toLowerCase() as keyof typeof stats]})` : ''}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading"><div className="spinner" /><span>Cargando citas...</span></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">{filtro ? `No hay citas ${filtro.toLowerCase()}s` : 'No tienes citas aún'}</div>
            <p>Solicita tu primera cita de imágenes diagnósticas</p>
            <Link href="/solicitar-cita" className="btn btn-primary" style={{ marginTop:20 }}>📅 Solicitar Cita</Link>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {filtered.map(c => (
              <div key={c.id} className="cita-card">
                {/* Date box */}
                <div className="cita-date-box">
                  <div className="cita-day">{dayNum(c.fecha)}</div>
                  <div className="cita-month">{monthAbbr(c.fecha)}</div>
                  <div style={{ fontSize:'.65rem', color:'var(--text-3)', marginTop:4 }}>
                    {new Date(c.fecha + 'T00:00:00').getFullYear()}
                  </div>
                </div>

                {/* Info */}
                <div className="cita-info">
                  <div className="cita-proc">{c.procedimiento_nombre}</div>
                  <div className="flex gap-2" style={{ marginBottom:4 }}>
                    <span className={`badge ${ESTADO_BADGE[c.estado]}`}>{ESTADO_ICON[c.estado]} {c.estado}</span>
                    {c.contraste === 'Simple' && <span className="badge badge-simple">Simple</span>}
                    {c.contraste === 'Contrastada' && <span className="badge badge-contrast">Contrastada</span>}
                    {c.contraste === 'Simple-Contrastada' && <span className="badge badge-sc">S+C</span>}
                  </div>
                  <div className="cita-meta">
                    <span className="cita-meta-item">🕐 {c.hora_inicio} – {c.hora_fin}</span>
                    <span className="cita-meta-item">🏥 {c.sede_nombre}</span>
                    <span className="cita-meta-item">📍 {c.sede_direccion}</span>
                    <span className="cita-meta-item">👨‍⚕️ {c.doctor_nombre}</span>
                    {c.sede_telefono && <span className="cita-meta-item">📞 {c.sede_telefono}</span>}
                    {c.autorizacion && <span className="cita-meta-item">🔖 Auth: {c.autorizacion}</span>}
                  </div>
                  {c.observaciones && (
                    <div style={{ marginTop:8, fontSize:'.82rem', color:'var(--text-3)', fontStyle:'italic' }}>
                      💬 {c.observaciones}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="cita-actions">
                  {(c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA') && (
                    <button onClick={() => cancelar(c.id)}
                      disabled={canceling === c.id}
                      className="btn btn-danger btn-sm">
                      {canceling === c.id ? '...' : 'Cancelar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
