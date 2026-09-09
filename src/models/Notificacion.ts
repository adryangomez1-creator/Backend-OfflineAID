export interface Notificacion {
  id_notificacion: number;
  id_usuario: number;
  titulo?: string | null;
  mensaje?: string | null;
  leida: boolean;
  fecha: Date;
}