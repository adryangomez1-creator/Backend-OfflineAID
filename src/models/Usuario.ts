export type RolUsuario = 'ADMIN' | 'CIUDADANO' | 'INSTITUCION' | 'OPERADOR';
export type EstadoUsuario = 'ACTIVO' | 'INACTIVO';

export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  correo: string;
  password: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  token_push?: string | null;
  modelo_dispositivo?: string | null;
  sistema_operativo?: string | null;
  fecha_registro: Date;
}