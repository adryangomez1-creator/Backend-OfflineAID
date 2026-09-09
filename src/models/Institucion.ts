export interface Institucion {
  id_institucion: number;
  nombre: string;
  tipo?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}