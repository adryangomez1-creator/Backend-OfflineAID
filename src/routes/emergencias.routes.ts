import { Router, type Router as ExpressRouter } from 'express';
import { emergenciasController } from '../controllers/emergencias.controller.js';

const router: ExpressRouter = Router();

// Reporte integral de emergencia con evidencias
router.post('/emergencias/reportar', emergenciasController.reportarEmergencia);

// Listado de emergencias activas priorizadas
router.get('/emergencias/activas', emergenciasController.obtenerEmergenciasActivas);

// Búsqueda geoespacial por radio en km
router.get('/emergencias/cercanas', emergenciasController.obtenerEmergenciasCercanas);

// Detalle 360° de la emergencia (usuario, tipo, evidencias, asignaciones)
router.get('/emergencias/detalle/:id', emergenciasController.obtenerDetalleCompleto);

// Historial de emergencias de un usuario
router.get('/emergencias/usuario/:id_usuario', emergenciasController.obtenerEmergenciasPorUsuario);

// Actualizar coordenadas y ubicación geográfica
router.patch('/emergencias/:id/ubicacion', emergenciasController.actualizarUbicacion);

// Cambiar estado del ciclo de vida de la emergencia
router.patch('/emergencias/:id/estado', emergenciasController.cambiarEstado);

export default router;
