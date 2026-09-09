import { Router, type Router as ExpressRouter } from 'express';
import { notificacionesController } from '../controllers/notificaciones.controller.js';

const router: ExpressRouter = Router();

// Consultar notificaciones no leídas de un usuario
router.get('/notificaciones/usuario/:id_usuario/no-leidas', notificacionesController.obtenerNoLeidas);

// Marcar notificación individual como leída
router.patch('/notificaciones/:id/leida', notificacionesController.marcarLeida);

// Marcar todas las notificaciones pendientes de un usuario como leídas
router.patch('/notificaciones/usuario/:id_usuario/leer-todas', notificacionesController.marcarTodasLeidas);

// Emitir alerta masiva comunitaria ante desastre o emergencia mayor
router.post('/notificaciones/alerta-comunitaria', notificacionesController.emitirAlertaComunitaria);

export default router;
