export interface Evidencia {
  id_evidencia: number;
  id_emergencia: number;
  url_imagen?: string | null;
  fecha_subida: Date;
}