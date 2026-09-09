import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';

export const asignacionesController = {
  /**
   * Asignar una institución de socorro a una emergencia (despacho de unidades).
   */
  asignarInstitucion: async (req: Request, res: Response): Promise<void> => {
    const idEmergencia = Number(req.params.id);
    const { id_institucion } = req.body;

    if (!id_institucion) {
      res.status(400).json({ error: 'El campo "id_institucion" es obligatorio' });
      return;
    }

    try {
      const [emFilas] = await pool.query<RowDataPacket[]>('SELECT id_usuario, titulo, estado FROM Emergencias WHERE id_emergencia = ?', [idEmergencia]);
      if (emFilas.length === 0) {
        res.status(404).json({ error: 'Emergencia no encontrada' });
        return;
      }
      const emergencia = emFilas[0];

      const [instFilas] = await pool.query<RowDataPacket[]>('SELECT id_institucion, nombre, telefono FROM Instituciones WHERE id_institucion = ?', [id_institucion]);
      if (instFilas.length === 0) {
        res.status(404).json({ error: 'Institución no encontrada' });
        return;
      }
      const institucion = instFilas[0];

      const [asigExistente] = await pool.query<RowDataPacket[]>(
        'SELECT estado FROM Asignaciones WHERE id_emergencia = ? AND id_institucion = ? AND estado != "FINALIZADA"',
        [idEmergencia, id_institucion]
      );
      if (asigExistente.length > 0) {
        res.status(400).json({ error: `Esta emergencia ya tiene asignada a la institución "${institucion.nombre}" en estado ${asigExistente[0].estado}` });
        return;
      }

      const [asigRes] = await pool.query<ResultSetHeader>(
        'INSERT INTO Asignaciones (id_emergencia, id_institucion, estado) VALUES (?, ?, "ASIGNADA")',
        [idEmergencia, id_institucion]
      );

      if (emergencia.estado === 'PENDIENTE') {
        await pool.query('UPDATE Emergencias SET estado = "EN_PROCESO" WHERE id_emergencia = ?', [idEmergencia]);
      }

      await pool.query(
        'INSERT INTO Notificaciones (id_usuario, titulo, mensaje) VALUES (?, ?, ?)',
        [emergencia.id_usuario, 'Unidad de Auxilio Asignada', `Se ha asignado a "${institucion.nombre}" para atender tu emergencia "${emergencia.titulo}". Teléfono: ${institucion.telefono || 'N/D'}.`]
      );

      res.status(201).json({
        mensaje: 'Institución asignada exitosamente a la emergencia',
        id_asignacion: asigRes.insertId,
        id_emergencia: idEmergencia,
        institucion: { id: institucion.id_institucion, nombre: institucion.nombre, telefono: institucion.telefono },
        estado_asignacion: 'ASIGNADA',
        estado_emergencia: 'EN_PROCESO',
      });
    } catch {
      res.status(500).json({ error: 'Error interno al asignar institución' });
    }
  },

  /**
   * Actualizar el estado de una asignación (ASIGNADA -> EN_PROCESO -> FINALIZADA).
   */
  actualizarEstado: async (req: Request, res: Response): Promise<void> => {
    const idAsignacion = Number(req.params.id);
    const { estado } = req.body;

    const estadosValidos = ['ASIGNADA', 'EN_PROCESO', 'FINALIZADA'];
    if (!estadosValidos.includes(estado)) {
      res.status(400).json({ error: `Estado inválido. Permitidos: ${estadosValidos.join(', ')}` });
      return;
    }

    try {
      const [filas] = await pool.query<RowDataPacket[]>(
        `SELECT a.*, e.id_usuario, e.titulo AS emergencia_titulo, i.nombre AS institucion_nombre
         FROM Asignaciones a
         INNER JOIN Emergencias e ON a.id_emergencia = e.id_emergencia
         INNER JOIN Instituciones i ON a.id_institucion = i.id_institucion
         WHERE a.id_asignacion = ?`,
        [idAsignacion]
      );

      if (filas.length === 0) {
        res.status(404).json({ error: 'Asignación no encontrada' });
        return;
      }

      const asignacion = filas[0];
      await pool.query('UPDATE Asignaciones SET estado = ? WHERE id_asignacion = ?', [estado, idAsignacion]);

      let emergenciaAtendida = false;
      if (estado === 'FINALIZADA') {
        const [pendientes] = await pool.query<RowDataPacket[]>(
          'SELECT COUNT(*) AS total FROM Asignaciones WHERE id_emergencia = ? AND estado != "FINALIZADA"',
          [asignacion.id_emergencia]
        );

        if (pendientes[0].total === 0) {
          await pool.query('UPDATE Emergencias SET estado = "ATENDIDA" WHERE id_emergencia = ?', [asignacion.id_emergencia]);
          emergenciaAtendida = true;
        }

        await pool.query(
          'INSERT INTO Notificaciones (id_usuario, titulo, mensaje) VALUES (?, ?, ?)',
          [
            asignacion.id_usuario,
            'Atención de Emergencia Concluida',
            `La institución "${asignacion.institucion_nombre}" finalizó la atención de tu reporte "${asignacion.emergencia_titulo}".${emergenciaAtendida ? ' La emergencia ha sido marcada como ATENDIDA.' : ''}`,
          ]
        );
      }

      res.json({
        mensaje: `Estado de la asignación actualizado a ${estado}`,
        id_asignacion: idAsignacion,
        nuevo_estado: estado,
        emergencia_marcada_atendida: emergenciaAtendida,
      });
    } catch {
      res.status(500).json({ error: 'Error al actualizar asignación' });
    }
  },

  /**
   * Obtener emergencias asignadas a una institución en particular.
   */
  obtenerPorInstitucion: async (req: Request, res: Response): Promise<void> => {
    const idInstitucion = Number(req.params.id);
    const { estado } = req.query;

    try {
      let sql = `
        SELECT a.id_asignacion, a.estado AS estado_asignacion, a.fecha_asignacion,
               e.*, t.nombre AS tipo_emergencia, t.nivel_prioridad,
               CONCAT(u.nombre, ' ', u.apellido) AS ciudadano_nombre, u.telefono AS ciudadano_telefono
        FROM Asignaciones a
        INNER JOIN Emergencias e ON a.id_emergencia = e.id_emergencia
        INNER JOIN TiposEmergencia t ON e.id_tipo = t.id_tipo
        INNER JOIN Usuarios u ON e.id_usuario = u.id_usuario
        WHERE a.id_institucion = ?
      `;
      const params: any[] = [idInstitucion];

      if (estado) {
        sql += ' AND a.estado = ?';
        params.push(estado);
      }

      sql += ' ORDER BY a.fecha_asignacion DESC';
      const [filas] = await pool.query<RowDataPacket[]>(sql, params);
      res.json(filas);
    } catch {
      res.status(500).json({ error: 'Error al consultar emergencias de la institución' });
    }
  },
};
