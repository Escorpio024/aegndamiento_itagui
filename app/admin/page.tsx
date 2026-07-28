'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ToastProvider';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Sede    { id:number; nombre:string; direccion:string; ciudad:string; telefono:string|null; activa:number; }
interface Doctor  { id:number; nombre:string; especialidad:string; activo:number; }
interface Horario { id:number; sede_id:number; doctor_id:number; fecha:string; hora_inicio:string; hora_fin:string; disponible:number; sede_nombre:string; doctor_nombre:string; cita_id?:number; cita_estado?:string; paciente_nombre?:string; }
interface Proc    { id:number; cups:string; nombre:string; modalidad:string; contraste:string; activo:number; }
interface Cita    { id:number; estado:string; paciente_nombre:string; documento:string; procedimiento_nombre:string; cups:string; sede_nombre:string; fecha:string; hora_inicio:string; hora_fin:string; doctor_nombre:string; created_at:string; }

const SECTIONS = [
  { id:'citas',        icon:'📋', label:'Citas' },
  { id:'sedes',        icon:'🏥', label:'Sedes' },
  { id:'doctores',     icon:'👨‍⚕️', label:'Doctores' },
  { id:'horarios',     icon:'🗓️', label:'Horarios' },
  { id:'procedimientos', icon:'🫁', label:'Procedimientos' },
];

const ESTADOS = ['PENDIENTE','CONFIRMADA','CANCELADA','COMPLETADA'];
const ESTADO_BADGE: Record<string,string> = { PENDIENTE:'badge-pendiente', CONFIRMADA:'badge-confirmada', CANCELADA:'badge-cancelada', COMPLETADA:'badge-completada' };

export default function AdminPage() {
  const toast = useToast();
  const [section, setSection] = useState('citas');
  const [loading, setLoading] = useState(false);

  // Data states
  const [citas,   setCitas]   = useState<Cita[]>([]);
  const [sedes,   setSedes]   = useState<Sede[]>([]);
  const [docs,    setDocs]    = useState<Doctor[]>([]);
  const [hors,    setHors]    = useState<Horario[]>([]);
  const [procs,   setProcs]   = useState<Proc[]>([]);

  // Filter states
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroSede,   setFiltroSede]   = useState('');
  const [filtroFecha,  setFiltroFecha]  = useState('');
  const [horFecha,     setHorFecha]     = useState(() => new Date().toISOString().split('T')[0]);
  const [horSede,      setHorSede]      = useState('');

  // Modal states
  const [modalSede,    setModalSede]    = useState<Partial<Sede>|null>(null);
  const [modalDoctor,  setModalDoctor]  = useState<Partial<Doctor>|null>(null);
  const [modalBulk,    setModalBulk]    = useState(false);
  const [bulk,         setBulk]         = useState({ sedeId:'', doctorId:'', fechaInicio:'', fechaFin:'', horaInicio:'08:00', horaFin:'17:00', duracionMinutos:30, diasSemana:[1,2,3,4,5] });

  const api = useCallback(async (method: string, path: string, body?: object) => {
    const r = await fetch(path, {
      method, headers:{ 'Content-Type':'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Error');
    return d;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (section === 'citas') {
        const q = new URLSearchParams();
        if (filtroEstado) q.set('estado', filtroEstado);
        if (filtroSede)   q.set('sedeId', filtroSede);
        if (filtroFecha)  q.set('fecha',  filtroFecha);
        const d = await api('GET', `/api/citas?${q}`);
        setCitas(d);
      }
      if (section === 'sedes')    { const d = await api('GET', '/api/sedes?all=true');       setSedes(d); }
      if (section === 'doctores') { const d = await api('GET', '/api/doctores?all=true');    setDocs(d); }
      if (section === 'horarios') {
        const q = new URLSearchParams({ admin:'true' });
        if (horSede)  q.set('sedeId', horSede);
        if (horFecha) q.set('fecha',  horFecha);
        const d = await api('GET', `/api/horarios?${q}`); setHors(d);
      }
      if (section === 'procedimientos') { const d = await api('GET', '/api/procedimientos'); setProcs(d); }
    } catch (e:any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [section, filtroEstado, filtroSede, filtroFecha, horSede, horFecha]);

  useEffect(() => { load(); }, [load]);
  // Load sedes and docs for selects
  useEffect(() => {
    api('GET', '/api/sedes?all=true').then(setSedes).catch(()=>{});
    api('GET', '/api/doctores?all=true').then(setDocs).catch(()=>{});
  }, []);

  const cambiarEstadoCita = async (id: number, estado: string) => {
    try { await api('PATCH', `/api/citas/${id}`, { estado }); toast('Estado actualizado.', 'success'); load(); }
    catch (e:any) { toast(e.message, 'error'); }
  };

  const saveSede = async () => {
    if (!modalSede) return;
    try {
      if (modalSede.id) await api('PUT', `/api/sedes/${modalSede.id}`, modalSede);
      else              await api('POST', '/api/sedes', modalSede);
      toast('Sede guardada.', 'success'); setModalSede(null); load();
    } catch (e:any) { toast(e.message, 'error'); }
  };

  const saveDoctor = async () => {
    if (!modalDoctor) return;
    try {
      if (modalDoctor.id) await api('PUT', `/api/doctores/${modalDoctor.id}`, modalDoctor);
      else                await api('POST', '/api/doctores', modalDoctor);
      toast('Doctor guardado.', 'success'); setModalDoctor(null); load();
    } catch (e:any) { toast(e.message, 'error'); }
  };

  const createBulk = async () => {
    try {
      const r = await api('POST', '/api/horarios/bulk', bulk);
      toast(`✅ ${r.creados} horarios creados.`, 'success'); setModalBulk(false); load();
    } catch (e:any) { toast(e.message, 'error'); }
  };

  const deleteHorario = async (id: number) => {
    if (!confirm('¿Eliminar este horario?')) return;
    try { await api('DELETE', `/api/horarios/${id}`); toast('Horario eliminado.', 'success'); load(); }
    catch (e:any) { toast(e.message, 'error'); }
  };

  const toggleProc = async (id: number) => {
    try { await api('PATCH', `/api/procedimientos/${id}`, {}); load(); }
    catch (e:any) { toast(e.message, 'error'); }
  };

  const toggleDay = (d: number) => {
    setBulk(b => ({
      ...b,
      diasSemana: b.diasSemana.includes(d) ? b.diasSemana.filter(x=>x!==d) : [...b.diasSemana, d],
    }));
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-label">Panel Admin</div>
        {SECTIONS.map(s => (
          <button key={s.id} className={`sidebar-link${section===s.id?' active':''}`}
            onClick={() => setSection(s.id)}>
            <span style={{ fontSize:18 }}>{s.icon}</span> {s.label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <div className="admin-content">

        {/* ── CITAS ────────────────────────────────────── */}
        {section === 'citas' && (
          <div>
            <div className="admin-toolbar">
              <h2 className="admin-title">📋 Gestión de Citas</h2>
            </div>
            {/* Filters */}
            <div className="flex gap-3" style={{ marginBottom:24, flexWrap:'wrap' }}>
              <select className="form-control" style={{ width:'auto' }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e}>{e}</option>)}
              </select>
              <select className="form-control" style={{ width:'auto' }} value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
                <option value="">Todas las sedes</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <input type="date" className="form-control" style={{ width:'auto' }} value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} />
              <button className="btn btn-outline btn-sm" onClick={() => { setFiltroEstado(''); setFiltroSede(''); setFiltroFecha(''); }}>Limpiar</button>
            </div>
            {loading ? <div className="loading"><div className="spinner" /></div> : (
              <div className="table-wrap">
                <div className="table-scroll">
                  <table>
                    <thead><tr>
                      <th>Paciente</th><th>Procedimiento</th><th>Sede</th><th>Fecha / Hora</th><th>Doctor</th><th>Estado</th><th>Acción</th>
                    </tr></thead>
                    <tbody>
                      {citas.length === 0 ? (
                        <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--text-3)' }}>Sin citas</td></tr>
                      ) : citas.map(c => (
                        <tr key={c.id}>
                          <td><div className="td-main">{c.paciente_nombre}</div><div className="td-sub">{c.documento}</div></td>
                          <td><div style={{ fontSize:'.82rem', color:'var(--text-1)' }}>{c.procedimiento_nombre.slice(0,40)}...</div></td>
                          <td>{c.sede_nombre}</td>
                          <td><div className="td-main">{c.fecha}</div><div className="td-sub">{c.hora_inicio}</div></td>
                          <td style={{ fontSize:'.82rem' }}>{c.doctor_nombre}</td>
                          <td><span className={`badge ${ESTADO_BADGE[c.estado]}`}>{c.estado}</span></td>
                          <td>
                            <select className="form-control" style={{ padding:'4px 10px', fontSize:'.8rem', width:140 }}
                              value={c.estado} onChange={e => cambiarEstadoCita(c.id, e.target.value)}>
                              {ESTADOS.map(e => <option key={e}>{e}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SEDES ────────────────────────────────────── */}
        {section === 'sedes' && (
          <div>
            <div className="admin-toolbar">
              <h2 className="admin-title">🏥 Sedes</h2>
              <button className="btn btn-primary" onClick={() => setModalSede({ ciudad:'Itagüi', activa:1 })}>+ Nueva Sede</button>
            </div>
            <div className="table-wrap">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Nombre</th><th>Dirección</th><th>Ciudad</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {sedes.map(s => (
                      <tr key={s.id}>
                        <td className="td-main">{s.nombre}</td>
                        <td>{s.direccion}</td>
                        <td>{s.ciudad}</td>
                        <td>{s.telefono || '—'}</td>
                        <td><span className={`badge ${s.activa ? 'badge-confirmada' : 'badge-cancelada'}`}>{s.activa ? 'Activa' : 'Inactiva'}</span></td>
                        <td className="flex gap-2">
                          <button className="btn btn-outline btn-sm" onClick={() => setModalSede(s)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={async () => { try { await api('DELETE', `/api/sedes/${s.id}`); toast('Sede desactivada.', 'success'); load(); } catch(e:any){toast(e.message,'error');} }}>
                            {s.activa ? 'Desactivar' : 'Ya inactiva'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── DOCTORES ─────────────────────────────────── */}
        {section === 'doctores' && (
          <div>
            <div className="admin-toolbar">
              <h2 className="admin-title">👨‍⚕️ Doctores</h2>
              <button className="btn btn-primary" onClick={() => setModalDoctor({ especialidad:'Radiología', activo:1 })}>+ Nuevo Doctor</button>
            </div>
            <div className="table-wrap">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Nombre</th><th>Especialidad</th><th>Estado</th><th>Acción</th></tr></thead>
                  <tbody>
                    {docs.map(d => (
                      <tr key={d.id}>
                        <td className="td-main">{d.nombre}</td>
                        <td>{d.especialidad}</td>
                        <td><span className={`badge ${d.activo ? 'badge-confirmada' : 'badge-cancelada'}`}>{d.activo ? 'Activo':'Inactivo'}</span></td>
                        <td className="flex gap-2">
                          <button className="btn btn-outline btn-sm" onClick={() => setModalDoctor(d)}>Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── HORARIOS ─────────────────────────────────── */}
        {section === 'horarios' && (
          <div>
            <div className="admin-toolbar">
              <h2 className="admin-title">🗓️ Horarios</h2>
              <button className="btn btn-primary" onClick={() => setModalBulk(true)}>⚡ Generar Horarios</button>
            </div>
            <div className="flex gap-3" style={{ marginBottom:20, flexWrap:'wrap' }}>
              <select className="form-control" style={{ width:'auto' }} value={horSede} onChange={e => setHorSede(e.target.value)}>
                <option value="">Todas las sedes</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <input type="date" className="form-control" style={{ width:'auto' }} value={horFecha} onChange={e => setHorFecha(e.target.value)} />
            </div>
            <div className="table-wrap">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Fecha</th><th>Hora</th><th>Sede</th><th>Doctor</th><th>Estado</th><th>Paciente</th><th></th></tr></thead>
                  <tbody>
                    {hors.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--text-3)' }}>Sin horarios para los filtros seleccionados</td></tr>
                    ) : hors.map(h => (
                      <tr key={h.id}>
                        <td className="td-main">{h.fecha}</td>
                        <td>{h.hora_inicio} – {h.hora_fin}</td>
                        <td>{h.sede_nombre}</td>
                        <td style={{ fontSize:'.84rem' }}>{h.doctor_nombre}</td>
                        <td><span className={`badge ${h.disponible ? 'badge-confirmada' : 'badge-pendiente'}`}>{h.disponible ? 'Disponible' : 'Ocupado'}</span></td>
                        <td style={{ fontSize:'.82rem', color:'var(--text-3)' }}>{h.paciente_nombre || '—'}</td>
                        <td>{h.disponible && <button className="btn btn-danger btn-sm" onClick={() => deleteHorario(h.id)}>Eliminar</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PROCEDIMIENTOS ───────────────────────────── */}
        {section === 'procedimientos' && (
          <div>
            <div className="admin-toolbar">
              <h2 className="admin-title">🫁 Procedimientos</h2>
              <span style={{ color:'var(--text-3)', fontSize:'.85rem' }}>{procs.length} procedimientos</span>
            </div>
            <div className="table-wrap">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>CUPS</th><th>Nombre</th><th>Contraste</th><th>Estado</th><th>Acción</th></tr></thead>
                  <tbody>
                    {procs.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontFamily:'monospace', color:'var(--teal)' }}>{p.cups}</td>
                        <td className="td-main" style={{ fontSize:'.87rem' }}>{p.nombre}</td>
                        <td>
                          {p.contraste === 'Simple' && <span className="badge badge-simple">Simple</span>}
                          {p.contraste === 'Contrastada' && <span className="badge badge-contrast">Contrastada</span>}
                          {p.contraste === 'Simple-Contrastada' && <span className="badge badge-sc">S+C</span>}
                        </td>
                        <td><span className={`badge ${p.activo ? 'badge-confirmada' : 'badge-cancelada'}`}>{p.activo ? 'Activo':'Inactivo'}</span></td>
                        <td><button className="btn btn-outline btn-sm" onClick={() => toggleProc(p.id)}>{p.activo ? 'Desactivar' : 'Activar'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: SEDE ────────────────────────────────────── */}
      {modalSede && (
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setModalSede(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modalSede.id ? 'Editar Sede' : 'Nueva Sede'}</div>
              <button className="modal-close" onClick={() => setModalSede(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Nombre *</label>
                <input className="form-control" value={modalSede.nombre||''} onChange={e => setModalSede(s => ({...s!,nombre:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Dirección *</label>
                <input className="form-control" value={modalSede.direccion||''} onChange={e => setModalSede(s => ({...s!,direccion:e.target.value}))} /></div>
              <div className="form-grid">
                <div className="form-group"><label className="form-label">Ciudad</label>
                  <input className="form-control" value={modalSede.ciudad||'Itagüi'} onChange={e => setModalSede(s => ({...s!,ciudad:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Teléfono</label>
                  <input className="form-control" value={modalSede.telefono||''} onChange={e => setModalSede(s => ({...s!,telefono:e.target.value}))} /></div>
              </div>
              {modalSede.id && (
                <div className="form-group"><label className="form-label">Estado</label>
                  <select className="form-control" value={modalSede.activa||1} onChange={e => setModalSede(s => ({...s!,activa:Number(e.target.value)}))}>
                    <option value={1}>Activa</option><option value={0}>Inactiva</option>
                  </select></div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalSede(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveSede}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DOCTOR ───────────────────────────────────── */}
      {modalDoctor && (
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setModalDoctor(null); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modalDoctor.id ? 'Editar Doctor' : 'Nuevo Doctor'}</div>
              <button className="modal-close" onClick={() => setModalDoctor(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Nombre completo *</label>
                <input className="form-control" placeholder="Dr. Nombre Apellido" value={modalDoctor.nombre||''} onChange={e => setModalDoctor(d => ({...d!,nombre:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Especialidad</label>
                <input className="form-control" value={modalDoctor.especialidad||''} onChange={e => setModalDoctor(d => ({...d!,especialidad:e.target.value}))} /></div>
              {modalDoctor.id && (
                <div className="form-group"><label className="form-label">Estado</label>
                  <select className="form-control" value={modalDoctor.activo||1} onChange={e => setModalDoctor(d => ({...d!,activo:Number(e.target.value)}))}>
                    <option value={1}>Activo</option><option value={0}>Inactivo</option>
                  </select></div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalDoctor(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveDoctor}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BULK HORARIOS ─────────────────────────────── */}
      {modalBulk && (
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setModalBulk(false); }}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">⚡ Generación Masiva de Horarios</div>
              <button className="modal-close" onClick={() => setModalBulk(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Sede *</label>
                <select className="form-control" value={bulk.sedeId} onChange={e => setBulk(b => ({...b,sedeId:e.target.value}))}>
                  <option value="">Seleccionar sede...</option>
                  {sedes.filter(s=>s.activa).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">Doctor *</label>
                <select className="form-control" value={bulk.doctorId} onChange={e => setBulk(b => ({...b,doctorId:e.target.value}))}>
                  <option value="">Seleccionar doctor...</option>
                  {docs.filter(d=>d.activo).map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select></div>
              <div className="form-grid">
                <div className="form-group"><label className="form-label">Fecha inicio *</label>
                  <input type="date" className="form-control" value={bulk.fechaInicio} onChange={e => setBulk(b => ({...b,fechaInicio:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Fecha fin *</label>
                  <input type="date" className="form-control" value={bulk.fechaFin} onChange={e => setBulk(b => ({...b,fechaFin:e.target.value}))} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Días de la semana</label>
                <div className="days-selector">
                  {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((d,i) => (
                    <button key={i} type="button" className={`day-btn${bulk.diasSemana.includes(i)?' selected':''}`} onClick={() => toggleDay(i)}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group"><label className="form-label">Hora inicio</label>
                  <input type="time" className="form-control" value={bulk.horaInicio} onChange={e => setBulk(b => ({...b,horaInicio:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Hora fin</label>
                  <input type="time" className="form-control" value={bulk.horaFin} onChange={e => setBulk(b => ({...b,horaFin:e.target.value}))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Duración por slot (minutos)</label>
                <input type="number" className="form-control" value={bulk.duracionMinutos} min={15} max={120} step={15}
                  onChange={e => setBulk(b => ({...b,duracionMinutos:Number(e.target.value)}))} /></div>
              <div className="alert alert-info" style={{ fontSize:'.83rem' }}>
                ℹ️ Se crearán slots de {bulk.duracionMinutos} min para los días seleccionados entre {bulk.horaInicio} y {bulk.horaFin}.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalBulk(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={createBulk}
                disabled={!bulk.sedeId||!bulk.doctorId||!bulk.fechaInicio||!bulk.fechaFin}>
                ⚡ Generar Horarios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
