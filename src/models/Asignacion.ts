export type EstadoAsignacion = 'ASIGNADA' | 'EN_PROCESO' | 'FINALIZADA';

export interface Asignacion {
  id_asignacion: number;
  id_emergencia: number;
  id_institucion: number;
  estado: EstadoAsignacion;
  fecha_asignacion: Date;
}