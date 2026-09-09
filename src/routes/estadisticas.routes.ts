import { Router, type Router as ExpressRouter } from 'express';
import { estadisticasController } from '../controllers/estadisticas.controller.js';

const router: ExpressRouter = Router();

// Dashboard y resumen de métricas de impacto de OfflineAid
router.get('/estadisticas/dashboard', estadisticasController.obtenerDashboard);

export default router;
