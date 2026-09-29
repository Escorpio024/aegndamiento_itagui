'use client';

import { SendProgress } from '@/app/admin/types';

interface Props {
  progress: SendProgress;
}

/**
 * Barra de progreso fija en la parte inferior de la pantalla durante el envío
 * de una campaña SMS. Permanece visible aunque el admin navegue dentro del panel.
 */
export default function SendProgressBar({ progress }: Props) {
  if (!progress.active) return null;

  const pct = progress.total > 0
    ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
    : 0;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'var(--surface-2, #1a1a2e)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '14px 24px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Spinner */}
          <span style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            border: '2px solid rgba(255,255,255,0.2)',
            borderTopColor: 'var(--teal, #00c9b1)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1, #e2e8f0)' }}>
            Enviando: {progress.campanaName}
          </span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-3, #94a3b8)', fontFamily: 'monospace' }}>
          {progress.processed} / {progress.total} — {pct}%
        </span>
      </div>

      {/* Progress bar track */}
      <div style={{
        height: 6,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 99,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--teal, #00c9b1), #4facfe)',
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: '0.78rem', color: 'var(--text-3, #94a3b8)' }}>
        <span>📱 SMS enviados: <strong style={{ color: '#4ade80' }}>{progress.sms}</strong></span>
        {progress.email > 0 && (
          <span>✉️ Emails: <strong style={{ color: '#60a5fa' }}>{progress.email}</strong></span>
        )}
        {progress.errors.length > 0 && (
          <span style={{ color: '#f87171' }}>
            ⚠️ {progress.errors.length} error{progress.errors.length !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
