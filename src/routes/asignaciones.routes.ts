import { Router, type Router as ExpressRouter } from 'express';
import { asignacionesController } from '../controllers/asignaciones.controller.js';

const router: ExpressRouter = Router();

// Asignar institución a una emergencia (despacho de socorro)
router.post('/emergencias/:id/asignar', asignacionesController.asignarInstitucion);

// Cambiar estado de asignación (ASIGNADA -> EN_PROCESO -> FINALIZADA)
router.patch('/asignaciones/:id/estado', asignacionesController.actualizarEstado);

// Obtener emergencias asignadas a una institución en particular
router.get('/instituciones/:id/emergencias', asignacionesController.obtenerPorInstitucion);

export default router;
