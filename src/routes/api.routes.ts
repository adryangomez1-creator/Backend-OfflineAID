import { Router, type Router as ExpressRouter } from 'express';
import { crearCrud } from '../controllers/crud.controller.js';

const router: ExpressRouter = Router();

function registrarCrud(ruta: string, tabla: string, id: string, columnas: string[]) {
  const crud = crearCrud(tabla, id, columnas);
  router.get(ruta, crud.obtenerTodos);
  router.get(`${ruta}/:id`, crud.obtenerPorId);
  router.post(ruta, crud.crear);
  router.put(`${ruta}/:id`, crud.actualizar);
  router.delete(`${ruta}/:id`, crud.eliminar);
}

registrarCrud('/usuarios', 'Usuarios', 'id_usuario', ['nombre', 'apellido', 'telefono', 'correo', 'password', 'rol', 'estado', 'token_push', 'modelo_dispositivo', 'sistema_operativo']);
registrarCrud('/tipos-emergencia', 'TiposEmergencia', 'id_tipo', ['nombre', 'descripcion', 'nivel_prioridad']);
registrarCrud('/emergencias', 'Emergencias', 'id_emergencia', ['id_usuario', 'id_tipo', 'titulo', 'descripcion', 'latitud', 'longitud', 'direccion', 'estado']);
registrarCrud('/evidencias', 'Evidencias', 'id_evidencia', ['id_emergencia', 'url_imagen']);
registrarCrud('/instituciones', 'Instituciones', 'id_institucion', ['nombre', 'tipo', 'telefono', 'correo', 'direccion']);
registrarCrud('/asignaciones', 'Asignaciones', 'id_asignacion', ['id_emergencia', 'id_institucion', 'estado']);
registrarCrud('/notificaciones', 'Notificaciones', 'id_notificacion', ['id_usuario', 'titulo', 'mensaje', 'leida']);
registrarCrud('/cola-offline', 'ColaOffline', 'id_cola', ['id_usuario', 'tipo_operacion', 'payload_json', 'estado_sync', 'mensaje_error', 'fecha_sync']);

export default router;