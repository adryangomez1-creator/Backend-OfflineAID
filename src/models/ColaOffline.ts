export type TipoOperacion = 'CREAR_EMERGENCIA' | 'ACTUALIZAR_EMERGENCIA' | 'SUBIR_EVIDENCIA' | 'ACTUALIZAR_UBICACION';
export type EstadoSync = 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';

export interface ColaOffline {
  id_cola: number;
  id_usuario: number;
  tipo_operacion: TipoOperacion;
  payload_json: unknown;
  estado_sync: EstadoSync;
  mensaje_error?: string | null;
  fecha_creacion: Date;
  fecha_sync?: Date | null;
}