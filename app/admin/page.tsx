'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ToastProvider';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Sede    { id:number; nombre:string; direccion:string; ciudad:string; telefono:string|null; activa:number; }
interface Doctor  { id:number; nombre:string; especialidad:string; activo:number; }
interface Horario { id:number; sede_id:number; doctor_id:number; fecha:string; hora_inicio:string; hora_fin:string; disponible:number; sede_nombre:string; doctor_nombre:string; cita_id?:number; cita_estado?:string; paciente_nombre?:string; }
interface Proc    { id:number; cups:string; nombre:string; modalidad:string; contraste:string; activo:number; }
interface Cita    { id:number; estado:string; paciente_nombre:string; documento:string; procedimiento_nombre:string; cups:string; sede_nombre:string; fecha:string; hora_inicio:string; hora_fin:string; doctor_nombre:string; created_at:string; }
interface Campana { id:number; nombre:string; mensaje_sms:string|null; mensaje_email:string|null; tipo_canal:string; estado:string; filtro_zona:string|null; filtro_municipios:string|null; filtro_sede_id:number|null; filtro_estado_cita:string|null; telefonos_prueba:string|null; total_destinatarios:number; enviados_sms:number; enviados_email:number; created_at:string; }
interface Destinatario { nombre:string; telefono:string; email:string; documento:string; zona:string; municipio:string; tipo_examen:string; }
interface ZonaInfo { nombre:string; total:number; municipios:{ nombre:string; total:number }[]; }

const SECTIONS = [
  { id:'citas',        icon:'📋', label:'Citas' },
  { id:'sedes',        icon:'🏥', label:'Sedes' },
  { id:'doctores',     icon:'👨‍⚕️', label:'Doctores' },
  { id:'horarios',     icon:'🗓️', label:'Horarios' },
  { id:'procedimientos', icon:'🫁', label:'Procedimientos' },
  { id:'campanas',     icon:'📣', label:'Campañas' },
];

const ESTADOS = ['PENDIENTE','CONFIRMADA','CANCELADA','COMPLETADA'];
const ESTADO_BADGE: Record<string,string> = { PENDIENTE:'badge-pendiente', CONFIRMADA:'badge-confirmada', CANCELADA:'badge-cancelada', COMPLETADA:'badge-completada' };

export default function AdminPage() {
  const toast = useToast();
  const [section, setSection] = useState('citas');
  const [loading, setLoading] = useState(false);

  // Data states
  const [citas,         setCitas]         = useState<Cita[]>([]);
  const [sedes,         setSedes]         = useState<Sede[]>([]);
  const [docs,          setDocs]          = useState<Doctor[]>([]);
  const [hors,          setHors]          = useState<Horario[]>([]);
  const [procs,         setProcs]         = useState<Proc[]>([]);
  const [campanas,      setCampanas]      = useState<Campana[]>([]);
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [loadingDest,   setLoadingDest]   = useState(false);
  const [enviando,      setEnviando]      = useState(false);

  // Campaña form
  const [modalCampana, setModalCampana] = useState(false);
  const [campanaForm,  setCampanaForm]  = useState({ nombre:'', mensaje_sms:'', mensaje_email:'', tipo_canal:'SMS', filtro_zona:'', filtro_municipios:[] as string[], filtro_sede_id:'', filtro_estado_cita:'', telefonos_prueba:'' });
  const [campanaSeleccionada, setCampanaSeleccionada] = useState<Campana|null>(null);
  const [zonas,           setZonas]           = useState<ZonaInfo[]>([]);
  const [municipiosAll,   setMunicipiosAll]   = useState<{nombre:string, total:number}[]>([]);
  const [contandoDest,    setContandoDest]    = useState(0);
  const [conteoLoading,   setConteoLoading]   = useState(false);

  // Filter states
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroSede,   setFiltroSede]   = useState('');
  const [filtroFecha,  setFiltroFecha]  = useState('');
  const [horFecha,     setHorFecha]     = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
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
      if (section === 'campanas') { const d = await api('GET', '/api/campanas'); setCampanas(d); }
    } catch (e:any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [section, filtroEstado, filtroSede, filtroFecha, horSede, horFecha]);

  useEffect(() => { load(); }, [load]);
  // Load sedes, docs y zonas para selects
  useEffect(() => {
    api('GET', '/api/sedes?all=true').then(setSedes).catch(()=>{});
    api('GET', '/api/doctores?all=true').then(setDocs).catch(()=>{});
    api('GET', '/api/campanas/zonas').then(data => {
      // El API devuelve { zonas, municipios, totales } o el array viejo
      if (Array.isArray(data)) {
        setZonas(data);
      } else if (data?.zonas) {
        setZonas(data.zonas);
        setMunicipiosAll(data.municipios || []);
      }
    }).catch(()=>{});
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

  const saveCampana = async () => {
    try {
      const r = await api('POST', '/api/campanas', campanaForm);
      toast(`✅ Campaña creada. ${r.total_destinatarios} destinatarios encontrados.`, 'success');
      setModalCampana(false);
      setCampanaForm({ nombre:'', mensaje_sms:'', mensaje_email:'', tipo_canal:'SMS', filtro_zona:'', filtro_municipios:[], filtro_sede_id:'', filtro_estado_cita:'', telefonos_prueba:'' });
      setContandoDest(0);
      load();
    } catch (e:any) { toast(e.message, 'error'); }
  };

  // Contar destinatarios al cambiar zona/municipios
  const contarDestinatarios = async (zona: string, municipios: string[]) => {
    if (municipios.length === 0) { setContandoDest(0); return; }
    setConteoLoading(true);
    try {
      const r = await api('POST', '/api/campanas', {
        nombre: '__preview__', tipo_canal:'SMS', mensaje_sms: 'x',
        filtro_zona: zona, filtro_municipios: municipios,
      });
      setContandoDest(r.total_destinatarios);
      // Borrar el preview inmediatamente para no llenar la BD de basura
      if (r.id) {
        await api('DELETE', `/api/campanas/${r.id}`).catch(()=>{});
      }
    } catch { setContandoDest(0); }
    finally { setConteoLoading(false); }
  };

  const toggleMunicipio = (mun: string) => {
    const cur = campanaForm.filtro_municipios;
    const next = cur.includes(mun) ? cur.filter(m => m !== mun) : [...cur, mun];
    setCampanaForm(f => ({ ...f, filtro_municipios: next }));
  };

  const verDestinatarios = async (c: Campana) => {
    setCampanaSeleccionada(c);
    setLoadingDest(true);
    try {
      const d = await api('GET', `/api/campanas/${c.id}/destinatarios`);
      setDestinatarios(d);
    } catch (e:any) { toast(e.message, 'error'); }
    finally { setLoadingDest(false); }
  };

  const enviarCampana = async (c: Campana) => {
    if (!confirm(`¿Enviar la campaña "${c.nombre}" a ${c.total_destinatarios} destinatarios? Esta acción no se puede deshacer.`)) return;
    setEnviando(true);
    toast('⏳ Enviando... esto puede tardar hasta 60 segundos. No cierres la ventana.', 'info');
    try {
      // Timeout generoso para no cortar mientras Vercel envía los SMS
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 65000);
      const r = await fetch(`/api/campanas/${c.id}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(tid);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error al enviar');
      toast(`✅ Campaña enviada. SMS: ${d.enviados_sms} | Email: ${d.enviados_email}`, 'success');
      if (d.errores?.length > 0) {
        console.warn('Errores de envío:', d.errores);
      }
      load();
    } catch (e:any) {
      if (e.name === 'AbortError') {
        // El servidor siguió trabajando pero el navegador agotó el tiempo
        toast('⚠️ El envío sigue en proceso en el servidor. Recarga en 30 segundos para ver el resultado.', 'info');
        setTimeout(() => load(), 30000);
      } else {
        toast(e.message, 'error');
      }
    }
    finally { setEnviando(false); }
  };

  const eliminarCampana = async (c: Campana) => {
    if (!confirm(`¿Estás seguro de eliminar la campaña "${c.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api('DELETE', `/api/campanas/${c.id}`);
      toast('🗑️ Campaña eliminada', 'success');
      load();
    } catch (e:any) { toast(e.message, 'error'); }
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

        {/* ── CAMPAÑAS ──────────────────────────────────────── */}
        {section === 'campanas' && (
          <div>
            <div className="admin-toolbar">
              <h2 className="admin-title">📣 Campañas de Recordatorio</h2>
              <button className="btn btn-primary" onClick={() => setModalCampana(true)}>+ Nueva Campaña</button>
            </div>

            {/* Stats */}
            <div className="flex gap-3" style={{ marginBottom:24, flexWrap:'wrap' }}>
              <div className="stat-card" style={{ flex:'1 1 180px' }}>
                <div className="stat-icon teal">📣</div>
                <div><div className="stat-value">{campanas.length}</div><div className="stat-label">Campañas totales</div></div>
              </div>
              <div className="stat-card" style={{ flex:'1 1 180px' }}>
                <div className="stat-icon succ">✅</div>
                <div><div className="stat-value">{campanas.filter(c=>c.estado==='ENVIADA').length}</div><div className="stat-label">Enviadas</div></div>
              </div>
              <div className="stat-card" style={{ flex:'1 1 180px' }}>
                <div className="stat-icon warn">📱</div>
                <div><div className="stat-value">{campanas.reduce((a,c)=>a+c.enviados_sms,0)}</div><div className="stat-label">SMS enviados</div></div>
              </div>
              <div className="stat-card" style={{ flex:'1 1 180px' }}>
                <div className="stat-icon blue">✉️</div>
                <div><div className="stat-value">{campanas.reduce((a,c)=>a+c.enviados_email,0)}</div><div className="stat-label">Emails enviados</div></div>
              </div>
            </div>

            {loading ? <div className="loading"><div className="spinner" /></div> : (
              campanas.length === 0 ? (
                <div style={{ textAlign:'center', padding:'60px 0' }}>
                  <div style={{ fontSize:48, marginBottom:16 }}>📣</div>
                  <div style={{ color:'var(--text-3)', fontSize:'1.05rem' }}>No hay campañas aún.</div>
                  <div style={{ color:'var(--text-3)', fontSize:'.85rem', marginTop:8 }}>Crea tu primera campaña para enviar recordatorios a los pacientes.</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  {campanas.map(c => (
                    <div key={c.id} className="campana-card">
                      <div className="campana-header">
                        <div>
                          <div className="campana-nombre">{c.nombre}</div>
                          <div className="campana-meta">
                            <span className={`badge ${c.estado==='ENVIADA'?'badge-confirmada':c.estado==='ENVIANDO'?'badge-pendiente':'badge-cancelada'}`}>{c.estado}</span>
                            <span className="campana-canal-badge">{c.tipo_canal}</span>
                            <span style={{ color:'var(--text-3)', fontSize:'.8rem' }}>🗓️ {c.created_at?.slice(0,10)}</span>
                          </div>
                        </div>
                        <div className="campana-stats">
                          <div className="campana-stat"><span className="campana-stat-val">{c.total_destinatarios}</span><span>Destinatarios</span></div>
                          {(c.tipo_canal==='SMS'||c.tipo_canal==='AMBOS') && <div className="campana-stat"><span className="campana-stat-val">{c.enviados_sms}</span><span>SMS</span></div>}
                          {(c.tipo_canal==='EMAIL'||c.tipo_canal==='AMBOS') && <div className="campana-stat"><span className="campana-stat-val">{c.enviados_email}</span><span>Email</span></div>}
                        </div>
                      </div>

                      {(c.filtro_zona || c.filtro_municipios) && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                          {c.filtro_zona && <span className="campana-zona-tag">📍 {c.filtro_zona}</span>}
                          {c.filtro_municipios && (() => { try { return (JSON.parse(c.filtro_municipios) as string[]).map((m:string) => <span key={m} className="campana-mun-tag">{m}</span>); } catch { return null; } })()}
                        </div>
                      )}

                      {c.mensaje_sms && (
                        <div className="campana-msg">
                          <span style={{ opacity:.5 }}>📱 SMS:</span> {c.mensaje_sms}
                        </div>
                      )}
                      {c.mensaje_email && (
                        <div className="campana-msg">
                          <span style={{ opacity:.5 }}>✉️ Email:</span> {c.mensaje_email}
                        </div>
                      )}

                      <div className="campana-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => verDestinatarios(c)}>👥 Ver destinatarios</button>
                        {c.estado === 'PENDIENTE' && (
                          <button className="btn btn-primary btn-sm" disabled={enviando} onClick={() => enviarCampana(c)}>
                            {enviando ? '⏳ Enviando...' : '🚀 Enviar ahora'}
                          </button>
                        )}
                        {c.estado === 'ENVIANDO' && (
                          <button className="btn btn-outline btn-sm" style={{ borderColor: 'rgba(255,165,0,0.5)', color: '#ffa500' }}
                            disabled={enviando}
                            onClick={async () => {
                              if (!confirm('Esta campaña quedó atascada. ¿Resetear su estado para poder reenviarla?')) return;
                              await fetch(`/api/campanas/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' } });
                              load();
                            }}>
                            ⚠️ Resetear estado
                          </button>
                        )}
                        <button 
                          className="btn btn-outline btn-sm" 
                          style={{ borderColor: 'rgba(255,68,68,0.3)', color: '#ff4444' }} 
                          onClick={() => eliminarCampana(c)}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Modal destinatarios */}
            {campanaSeleccionada && (
              <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setCampanaSeleccionada(null); }}>
                <div className="modal" style={{ maxWidth:700, width:'90vw' }}>
                  <div className="modal-header">
                    <div className="modal-title">👥 Destinatarios — {campanaSeleccionada.nombre}</div>
                    <button className="modal-close" onClick={() => setCampanaSeleccionada(null)}>✕</button>
                  </div>
                  <div className="modal-body">
                    {loadingDest ? <div className="loading"><div className="spinner" /></div> : (
                      destinatarios.length === 0 ? (
                        <div style={{ textAlign:'center', padding:32, color:'var(--text-3)' }}>Sin destinatarios para los filtros de esta campaña.</div>
                      ) : (
                        <>
                          <div style={{ marginBottom:12, fontSize:'.85rem', color:'var(--text-3)' }}>{destinatarios.length} pacientes encontrados</div>
                          <div className="table-wrap"><div className="table-scroll">
                            <table>
                              <thead><tr><th>Paciente</th><th>Teléfono</th><th>Municipio</th><th>Zona</th><th>Examen</th></tr></thead>
                              <tbody>
                                {destinatarios.map((d, i) => (
                                  <tr key={i}>
                                    <td><div className="td-main">{d.nombre}</div><div className="td-sub">{d.documento}</div></td>
                                    <td style={{ fontSize:'.85rem' }}>{d.telefono}</td>
                                    <td style={{ fontSize:'.82rem' }}>{d.municipio}</td>
                                    <td style={{ fontSize:'.82rem', color:'var(--text-3)' }}>{d.zona}</td>
                                    <td style={{ fontSize:'.75rem', color:'var(--text-3)' }}>{d.tipo_examen}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div></div>
                        </>
                      )
                    )}
                  </div>
                  <div className="modal-footer">
                    <button className="btn btn-outline" onClick={() => setCampanaSeleccionada(null)}>Cerrar</button>
                    {campanaSeleccionada.estado !== 'ENVIADA' && (
                      <button className="btn btn-primary" disabled={enviando} onClick={() => { setCampanaSeleccionada(null); enviarCampana(campanaSeleccionada); }}>
                        {enviando ? '⏳ Enviando...' : '🚀 Enviar campaña'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: NUEVA CAMPAÑA ──────────────────────────────── */}
      {modalCampana && (
        <div className="modal-overlay open" onClick={e => { if(e.target===e.currentTarget) setModalCampana(false); }}>
          <div className="modal" style={{ maxWidth:640, width:'92vw' }}>
            <div className="modal-header">
              <div className="modal-title">📣 Nueva Campaña</div>
              <button className="modal-close" onClick={() => setModalCampana(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Nombre */}
              <div className="form-group"><label className="form-label">Nombre de la campaña *</label>
                <input className="form-control" placeholder="Ej: Recordatorio toma citología agosto" value={campanaForm.nombre} onChange={e => setCampanaForm(f=>({...f,nombre:e.target.value}))} /></div>

              {/* Canal */}
              <div className="form-group"><label className="form-label">Canal de envío *</label>
                <select className="form-control" value={campanaForm.tipo_canal} onChange={e => setCampanaForm(f=>({...f,tipo_canal:e.target.value}))}>
                  <option value="SMS">📱 Solo SMS</option>
                  <option value="EMAIL">✉️ Solo Email</option>
                  <option value="AMBOS">📱✉️ SMS + Email</option>
                </select></div>

              {/* Teléfonos de prueba */}
              <div className="form-group">
                <label className="form-label">Teléfonos de prueba (Opcional)
                  <span style={{ color:'var(--text-3)', fontWeight:400, fontSize:'.78rem', marginLeft:8 }}>(Separados por coma)</span>
                </label>
                <input className="form-control" placeholder="Ej: 3001234567, 3109876543" value={campanaForm.telefonos_prueba} onChange={e => setCampanaForm(f=>({...f,telefonos_prueba:e.target.value}))} />
              </div>

              {/* ── Selector Municipios ───────────────── */}
              {(() => {
                const munsToRender = municipiosAll;
                
                if (munsToRender.length === 0) return null;

                return (
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>🏙️ Municipios</span>
                      <span style={{ color:'var(--text-3)', fontWeight:400, fontSize:'.78rem' }}>
                        {campanaForm.filtro_municipios.length === munsToRender.length ? 'Todos seleccionados' : `${campanaForm.filtro_municipios.length} seleccionados`}
                      </span>
                    </label>
                    
                    <button type="button" className="btn btn-outline btn-sm" style={{ marginBottom: 10, width: '100%' }} onClick={() => {
                      const allMuns = munsToRender.map(m => m.nombre);
                      const isAll = campanaForm.filtro_municipios.length === munsToRender.length;
                      const next = isAll ? [] : allMuns;
                      setCampanaForm(f => ({...f, filtro_municipios: next}));
                      contarDestinatarios(campanaForm.filtro_zona, next);
                    }}>
                      {campanaForm.filtro_municipios.length === munsToRender.length ? '❌ Deseleccionar todos' : '✅ Seleccionar todos'}
                    </button>
                    <div className="municipio-grid" style={{ maxHeight: 300, overflowY: 'auto', padding: 4 }}>
                      {munsToRender.map(m => {
                        const sel = campanaForm.filtro_municipios.includes(m.nombre);
                        return (
                          <button key={m.nombre} type="button"
                            className={`municipio-btn${sel ? ' selected' : ''}`}
                            onClick={() => {
                              const next = sel
                                ? campanaForm.filtro_municipios.filter(x => x !== m.nombre)
                                : [...campanaForm.filtro_municipios, m.nombre];
                              setCampanaForm(f => ({...f, filtro_municipios: next}));
                              contarDestinatarios(campanaForm.filtro_zona, next);
                            }}>
                            {m.nombre}
                            <span className="municipio-count">{m.total.toLocaleString()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Preview destinatarios */}
              {campanaForm.filtro_zona && (
                <div className="dest-preview">
                  <span style={{ fontSize:'1.1rem' }}>👥</span>
                  {conteoLoading
                    ? <span>Calculando...</span>
                    : <><strong style={{ fontSize:'1.15rem', background:'var(--grad)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{contandoDest.toLocaleString()}</strong> personas en la selección</>}
                </div>
              )}

              {/* Mensaje SMS */}
              {(campanaForm.tipo_canal === 'SMS' || campanaForm.tipo_canal === 'AMBOS') && (
                <div className="form-group">
                  <label className="form-label">Mensaje SMS *
                    <span style={{ color:'var(--text-3)', fontWeight:400, fontSize:'.8rem', marginLeft:6 }}>({campanaForm.mensaje_sms.length}/319)</span>
                  </label>
                  <textarea className="form-control" rows={3} maxLength={319}
                    placeholder="Ej: Estimado paciente, le recordamos su cita médica. Para más info llame al 3609000."
                    value={campanaForm.mensaje_sms} onChange={e => setCampanaForm(f=>({...f,mensaje_sms:e.target.value}))} style={{ resize:'vertical', minHeight:80 }} />
                </div>
              )}

              {/* Mensaje Email */}
              {(campanaForm.tipo_canal === 'EMAIL' || campanaForm.tipo_canal === 'AMBOS') && (
                <div className="form-group">
                  <label className="form-label">Mensaje Email *</label>
                  <textarea className="form-control" rows={4}
                    placeholder="Ej: Estimado paciente, le recordamos que tiene una cita médica programada..."
                    value={campanaForm.mensaje_email} onChange={e => setCampanaForm(f=>({...f,mensaje_email:e.target.value}))} style={{ resize:'vertical', minHeight:100 }} />
                </div>
              )}

              <div className="alert alert-info" style={{ fontSize:'.83rem' }}>
                ℹ️ Los destinatarios se toman de la base de demanda inducida según los municipios seleccionados.
                {campanaForm.filtro_municipios.length === 0 && ' Si no seleccionas ningún municipio, la campaña solo se enviará a los teléfonos de prueba.'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalCampana(false)}>Cancelar</button>
              <button className="btn btn-primary"
                disabled={!campanaForm.nombre}
                onClick={saveCampana}>Crear campaña</button>
            </div>
          </div>
        </div>
      )}

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
