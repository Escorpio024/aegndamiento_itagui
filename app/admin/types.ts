// ─── Shared types for the admin panel ───────────────────────────────────────

export interface Sede {
  id: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string | null;
  activa: number;
}

export interface Doctor {
  id: number;
  nombre: string;
  especialidad: string;
  activo: number;
}

export interface Horario {
  id: number;
  sede_id: number;
  doctor_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  disponible: number;
  sede_nombre: string;
  doctor_nombre: string;
  cita_id?: number;
  cita_estado?: string;
  paciente_nombre?: string;
}

export interface Proc {
  id: number;
  cups: string;
  nombre: string;
  modalidad: string;
  contraste: string;
  activo: number;
}

export interface Cita {
  id: number;
  estado: string;
  paciente_nombre: string;
  documento: string;
  procedimiento_nombre: string;
  cups: string;
  sede_nombre: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  doctor_nombre: string;
  created_at: string;
}

export interface Campana {
  id: number;
  nombre: string;
  mensaje_sms: string | null;
  mensaje_email: string | null;
  tipo_canal: string;
  estado: string;
  filtro_zona: string | null;
  filtro_municipios: string | null;
  filtro_sede_id: number | null;
  filtro_estado_cita: string | null;
  filtro_tipo_examen: string | null;
  limite_envios: number | null;
  telefonos_prueba: string | null;
  total_destinatarios: number;
  enviados_sms: number;
  enviados_email: number;
  created_at: string;
}

export interface Destinatario {
  nombre: string;
  telefono: string;
  email: string;
  documento: string;
  zona: string;
  municipio: string;
  tipo_examen: string;
}

export interface ZonaInfo {
  nombre: string;
  total: number;
  municipios: { nombre: string; total: number }[];
}

export interface SendProgress {
  active: boolean;
  campanaName: string;
  processed: number;
  total: number;
  sms: number;
  email: number;
  errors: string[];
}

export const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'COMPLETADA'] as const;

export const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'badge-pendiente',
  CONFIRMADA: 'badge-confirmada',
  CANCELADA: 'badge-cancelada',
  COMPLETADA: 'badge-completada',
};
