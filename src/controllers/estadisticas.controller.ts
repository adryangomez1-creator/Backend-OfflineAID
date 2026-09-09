import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';

export const estadisticasController = {
  /**
   * Resumen y métricas de impacto del sistema OfflineAid (Slide 5).
   * Monitorea emergencias, efectividad de sincronización offline y despacho institucional.
   */
  obtenerDashboard: async (_req: Request, res: Response): Promise<void> => {
    try {
      // 1. Totales generales
      const [totales] = await pool.query<RowDataPacket[]>(`
        SELECT
          (SELECT COUNT(*) FROM Usuarios WHERE estado = 'ACTIVO') AS total_usuarios_activos,
          (SELECT COUNT(*) FROM Emergencias) AS total_emergencias,
          (SELECT COUNT(*) FROM Evidencias) AS total_evidencias,
          (SELECT COUNT(*) FROM Instituciones) AS total_instituciones,
          (SELECT COUNT(*) FROM ColaOffline) AS total_operaciones_offline
      `);

      // 2. Emergencias por estado
      const [porEstado] = await pool.query<RowDataPacket[]>(`
        SELECT estado, COUNT(*) AS cantidad
        FROM Emergencias
        GROUP BY estado
      `);

      // 3. Emergencias por prioridad
      const [porPrioridad] = await pool.query<RowDataPacket[]>(`
        SELECT t.nivel_prioridad, COUNT(e.id_emergencia) AS cantidad
        FROM TiposEmergencia t
        LEFT JOIN Emergencias e ON t.id_tipo = e.id_tipo
        GROUP BY t.nivel_prioridad
        ORDER BY FIELD(t.nivel_prioridad, 'CRITICA', 'ALTA', 'MEDIA', 'BAJA')
      `);

      // 4. Métricas de efectividad de la cola offline (Impacto del núcleo offline)
      const [syncMetricas] = await pool.query<RowDataPacket[]>(`
        SELECT estado_sync, COUNT(*) AS cantidad
        FROM ColaOffline
        GROUP BY estado_sync
      `);

      const [syncOperaciones] = await pool.query<RowDataPacket[]>(`
        SELECT tipo_operacion, COUNT(*) AS cantidad
        FROM ColaOffline
        GROUP BY tipo_operacion
      `);

      // 5. Instituciones con mayor actividad y atención
      const [topInstituciones] = await pool.query<RowDataPacket[]>(`
        SELECT i.id_institucion, i.nombre, i.tipo,
               COUNT(a.id_asignacion) AS total_asignaciones,
               SUM(CASE WHEN a.estado = 'FINALIZADA' THEN 1 ELSE 0 END) AS emergencias_completadas
        FROM Instituciones i
        LEFT JOIN Asignaciones a ON i.id_institucion = a.id_institucion
        GROUP BY i.id_institucion, i.nombre, i.tipo
        ORDER BY total_asignaciones DESC
      `);

      res.json({
        fecha_reporte: new Date().toISOString(),
        totales_globales: totales[0],
        emergencias_por_estado: porEstado,
        emergencias_por_prioridad: porPrioridad,
        impacto_sincronizacion_offline: {
          resumen_por_estado: syncMetricas,
          resumen_por_tipo_operacion: syncOperaciones,
        },
        actividad_instituciones: topInstituciones,
      });
    } catch (error: any) {
      console.error('Error al generar estadísticas:', error);
      res.status(500).json({ error: 'Error al generar dashboard de estadísticas' });
    }
  },
};
