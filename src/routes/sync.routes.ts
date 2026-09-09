import { Router, type Router as ExpressRouter } from 'express';
import { syncController } from '../controllers/sync.controller.js';

const router: ExpressRouter = Router();

// Sincronización masiva de acciones offline
router.post('/sync/batch', syncController.sincronizarLote);

// Paquete de datos iniciales para almacenar localmente en la app
router.get('/sync/datos-offline', syncController.obtenerDatosOffline);

// Consultar cola pendiente o con error
router.get('/cola-offline/pendientes', syncController.obtenerPendientesCola);

// Reintentar procesar un elemento de la cola offline
router.post('/cola-offline/:id/reintentar', syncController.reintentarCola);

export default router;
