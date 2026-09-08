export type NivelPrioridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface TipoEmergencia {
  id_tipo: number;
  nombre: string;
  descripcion?: string | null;
  nivel_prioridad: NivelPrioridad;
}