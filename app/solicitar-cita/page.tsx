'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

// ─── Types ───────────────────────────────────────────────
interface User { id:number; nombre:string; documento:string; tipo_doc:string; telefono:string; email:string; regimen:string|null; }
interface Sede { id:number; nombre:string; direccion:string; ciudad:string; telefono:string|null; }
interface Proc { id:number; cups:string; nombre:string; contraste:string; }
interface Slot { id:number; sede_id:number; doctor_id:number; fecha:string; hora_inicio:string; hora_fin:string; doctor_nombre:string; }

const STEPS = ['Mis datos','Sede','Procedimiento','Horario','Confirmación'];

export default function SolicitarCitaPage() {
  const router = useRouter();
  const toast  = useToast();
  const [step, setStep]   = useState(0);
  const [loading, setLoading] = useState(false);

  // Data
  const [user,   setUser]   = useState<User|null>(null);
  const [sedes,  setSedes]  = useState<Sede[]>([]);
  const [procs,  setProcs]  = useState<Proc[]>([]);
  const [slots,  setSlots]  = useState<Slot[]>([]);

  // Selections
  const [telefono,  setTelefono]  = useState('');
  const [sedeId,    setSedeId]    = useState<number|null>(null);
  const [procId,    setProcId]    = useState<number|null>(null);
  const [slotId,    setSlotId]    = useState<number|null>(null);
  const [tieneAutorizacion, setTieneAutorizacion] = useState<boolean|null>(null);
  const [autoriza,  setAutoriza]  = useState('');
  const [obs,       setObs]       = useState('');
  const [fecha,     setFecha]     = useState(() => new Date().toISOString().split('T')[0]);

  const selectedSede = sedes.find(s => s.id === sedeId);
  const selectedProc = procs.find(p => p.id === procId);
  const selectedSlot = slots.find(s => s.id === slotId);

  // Load user + base data
  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) { router.push('/login?redirect=/solicitar-cita'); return; }
      return r.json();
    }).then((u: User) => { if (u) { setUser(u); setTelefono(u.telefono); } });

    fetch('/api/sedes').then(r => r.json()).then(setSedes);
    fetch('/api/procedimientos').then(r => r.json()).then(setProcs);
  }, []);

  // Load slots when sede or date changes
  useEffect(() => {
    if (!sedeId) { setSlots([]); return; }
    fetch(`/api/horarios?sedeId=${sedeId}&fecha=${fecha}`)
      .then(r => r.json()).then(setSlots);
    setSlotId(null);
  }, [sedeId, fecha]);

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const canNext = [
    !!telefono && telefono.length > 6,
    !!sedeId,
    !!procId,
    !!slotId,
    true,
  ][step];

  const handleSubmit = async () => {
    if (!sedeId || !procId || !slotId) return;
    setLoading(true);
    try {
      const r = await fetch('/api/citas', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ procedimientoId:procId, horarioId:slotId, sedeId, autorizacion:autoriza||null, observaciones:obs||null }),
      });
      const data = await r.json();
      if (!r.ok) { toast(data.error, 'error'); return; }
      toast('🎉 ¡Cita agendada exitosamente!', 'success');
      router.push('/mis-citas');
    } catch { toast('Error al agendar la cita.', 'error'); }
    finally { setLoading(false); }
  };

  if (!user) return <div className="loading" style={{ marginTop:120 }}><div className="spinner" /><span>Verificando sesión...</span></div>;

  return (
    <div className="wizard-page">
      {/* Header */}
      <div className="wizard-header">
        <div className="section-tag">📅 Nueva Cita</div>
        <h1 style={{ fontSize:'2rem', marginTop:12 }}>Solicitar Imágenes Diagnósticas</h1>
        <p className="hero-sub" style={{ margin:'12px auto 0' }}>Completa los pasos para reservar tu cita</p>
      </div>

      {/* Step Indicators */}
      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <div key={label} className={`wizard-step${i < step ? ' completed' : ''}${i === step ? ' active' : ''}`}>
            <div className="step-circle">{i < step ? '✓' : i + 1}</div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Panels */}
      <div className="wizard-body">
        {/* Step 0 — Mis datos */}
        <div className={`wizard-panel${step === 0 ? ' active' : ''}`}>
          <h3>Confirma tus datos</h3>
          <div className="confirm-box">
            <div className="confirm-row"><span className="confirm-key">Nombre</span><span className="confirm-val">{user.nombre}</span></div>
            <div className="confirm-row"><span className="confirm-key">Documento</span><span className="confirm-val">{user.tipo_doc} {user.documento}</span></div>
            <div className="confirm-row"><span className="confirm-key">Correo</span><span className="confirm-val">{user.email}</span></div>
            <div className="confirm-row"><span className="confirm-key">Régimen</span><span className="confirm-val">{user.regimen || '—'}</span></div>
          </div>
          <div className="form-group">
            <label className="form-label">Teléfono de contacto <span className="req">*</span></label>
            <input type="tel" className="form-control" value={telefono}
              onChange={e => setTelefono(e.target.value)} placeholder="3001234567" />
            <span style={{ fontSize:'.78rem', color:'var(--text-3)' }}>Confirma o actualiza tu número para esta cita</span>
          </div>
        </div>

        {/* Step 1 — Sede */}
        <div className={`wizard-panel${step === 1 ? ' active' : ''}`}>
          <h3>Selecciona la sede</h3>
          <div className="grid-3" style={{ gridTemplateColumns:'1fr' }}>
            {sedes.map(s => (
              <div key={s.id} onClick={() => setSedeId(s.id)}
                style={{
                  padding:20, border:`2px solid ${sedeId===s.id?'var(--teal)':'var(--border)'}`,
                  borderRadius:'var(--r-lg)', cursor:'pointer', transition:'all .2s',
                  background: sedeId===s.id ? 'var(--teal-dim)' : 'rgba(255,255,255,.03)',
                  display:'flex', alignItems:'center', gap:16,
                }}>
                <div style={{ fontSize:28 }}>🏥</div>
                <div>
                  <div style={{ fontWeight:700, color:'var(--text-1)' }}>{s.nombre}</div>
                  <div style={{ fontSize:'.83rem', color:'var(--text-2)', marginTop:4 }}>📍 {s.direccion} · {s.ciudad}</div>
                  {s.telefono && <div style={{ fontSize:'.83rem', color:'var(--text-2)' }}>📞 {s.telefono}</div>}
                </div>
                {sedeId===s.id && <div style={{ marginLeft:'auto', fontSize:22 }}>✅</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step 2 — Procedimiento */}
        <div className={`wizard-panel${step === 2 ? ' active' : ''}`}>
          <h3>Tipo de imágenes diagnósticas</h3>
          <div className="form-group" style={{ marginBottom:16 }}>
            <label className="form-label">Buscar procedimiento</label>
            <input type="text" className="form-control" placeholder="Escribe para filtrar..." id="proc-search"
              onChange={e => {
                const q = e.target.value.toLowerCase();
                document.querySelectorAll('.proc-item').forEach((el: any) => {
                  el.style.display = el.dataset.name.toLowerCase().includes(q) ? '' : 'none';
                });
              }} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:400, overflowY:'auto' }}>
            {procs.map(p => (
              <div key={p.id} className="proc-item" data-name={p.nombre} onClick={() => setProcId(p.id)}
                style={{
                  padding:'14px 18px', border:`2px solid ${procId===p.id?'var(--teal)':'var(--border)'}`,
                  borderRadius:'var(--r-md)', cursor:'pointer', transition:'all .2s',
                  background: procId===p.id ? 'var(--teal-dim)' : 'rgba(255,255,255,.02)',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                }}>
                <div>
                  <div style={{ fontWeight:600, color:'var(--text-1)', fontSize:'.92rem' }}>{p.nombre}</div>
                  <div style={{ fontSize:'.73rem', color:'var(--text-3)', marginTop:3 }}>CUPS {p.cups}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {p.contraste === 'Simple' && <span className="badge badge-simple">Simple</span>}
                  {p.contraste === 'Contrastada' && <span className="badge badge-contrast">Contrastada</span>}
                  {p.contraste === 'Simple-Contrastada' && <span className="badge badge-sc">S+C</span>}
                  {procId===p.id && <span>✅</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3 — Horario */}
        <div className={`wizard-panel${step === 3 ? ' active' : ''}`}>
          <h3>Selecciona fecha y hora</h3>
          <div className="form-group" style={{ marginBottom:20 }}>
            <label className="form-label">Fecha de cita <span className="req">*</span></label>
            <input type="date" className="form-control" value={fecha}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setFecha(e.target.value)} />
          </div>
          {slots.length > 0 ? (
            <>
              <p style={{ fontSize:'.85rem', color:'var(--text-3)', marginBottom:12 }}>
                {slots.length} horario{slots.length!==1?'s':''} disponible{slots.length!==1?'s':''} para el {fecha}
              </p>
              <div className="horarios-grid">
                {slots.map(s => (
                  <div key={s.id} className={`horario-slot${slotId===s.id?' selected':''}`}
                    onClick={() => setSlotId(s.id)}>
                    <div className="slot-time">{s.hora_inicio}</div>
                    <div className="slot-doctor">{s.doctor_nombre.split(' ').slice(0,2).join(' ')}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding:'32px 0' }}>
              <div className="empty-icon">📅</div>
              <div className="empty-title">Sin horarios disponibles</div>
              <p>Selecciona otra fecha o cambia la sede</p>
            </div>
          )}
        </div>

        {/* Step 4 — Confirmación */}
        <div className={`wizard-panel${step === 4 ? ' active' : ''}`}>
          <h3>Resumen de tu cita</h3>
          <div className="confirm-box">
            <div className="confirm-row"><span className="confirm-key">Paciente</span><span className="confirm-val">{user.nombre}</span></div>
            <div className="confirm-row"><span className="confirm-key">Sede</span><span className="confirm-val">{selectedSede?.nombre}</span></div>
            <div className="confirm-row"><span className="confirm-key">Procedimiento</span><span className="confirm-val" style={{ fontSize:'.82rem' }}>{selectedProc?.nombre}</span></div>
            <div className="confirm-row"><span className="confirm-key">Fecha</span><span className="confirm-val">{new Date(fecha+'T00:00:00').toLocaleDateString('es-CO',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</span></div>
            <div className="confirm-row"><span className="confirm-key">Hora</span><span className="confirm-val">{selectedSlot?.hora_inicio} – {selectedSlot?.hora_fin}</span></div>
            <div className="confirm-row"><span className="confirm-key">Médico</span><span className="confirm-val">{selectedSlot?.doctor_nombre}</span></div>
            <div className="confirm-row"><span className="confirm-key">Teléfono</span><span className="confirm-val">{telefono}</span></div>
          </div>
          
          <div style={{ marginTop:16, padding:16, background:'rgba(255,255,255,.02)', borderRadius:'var(--r-md)', border:'1px solid var(--border)' }}>
            <h4 style={{ marginBottom:12, fontSize:'1rem' }}>Orden Médica / Autorización</h4>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Sube aquí la imagen o PDF de tu orden <span style={{ color:'var(--text-3)', fontWeight:400 }}>(Opcional)</span></label>
              <input type="file" className="form-control" accept=".pdf,image/*" onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setAutoriza(`[ARCHIVO] ${e.target.files[0].name}`);
                }
              }} />
            </div>
          </div>

          <div className="form-group" style={{ marginTop:16 }}>
            <label className="form-label">Observaciones <span style={{ color:'var(--text-3)', fontWeight:400 }}>(opcional)</span></label>
            <textarea className="form-control" rows={3} placeholder="Información adicional para el médico..."
              value={obs} onChange={e => setObs(e.target.value)} />
          </div>
          <div className="alert alert-info" style={{ marginTop:8 }}>
            <span>ℹ️</span> Recuerda llevar tu autorización médica y documento de identidad el día de la cita.
          </div>
        </div>

        {/* Navigation */}
        <div className="wizard-nav">
          <button onClick={prev} className="btn btn-outline" style={{ visibility: step===0?'hidden':'visible' }}>
            ← Anterior
          </button>
          <span style={{ fontSize:'.82rem', color:'var(--text-3)' }}>Paso {step+1} de {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="btn btn-primary" disabled={!canNext}>Siguiente →</button>
          ) : (
            <button onClick={handleSubmit} className={`btn btn-primary${loading?' btn-loading':''}`} disabled={loading}>
              {loading ? <><span className="spinner spinner-sm" /> Agendando...</> : '✅ Confirmar Cita'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
