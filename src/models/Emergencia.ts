export type EstadoEmergencia = 'PENDIENTE' | 'EN_PROCESO' | 'ATENDIDA' | 'CANCELADA';

export interface Emergencia {
  id_emergencia: number;
  id_usuario: number;
  id_tipo: number;
  titulo: string;
  descripcion: string;
  latitud?: number | null;
  longitud?: number | null;
  direccion?: string | null;
  estado: EstadoEmergencia;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}