import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';

export const notificacionesController = {
  /**
   * Obtener notificaciones no leídas de un usuario en específico.
   */
  obtenerNoLeidas: async (req: Request, res: Response): Promise<void> => {
    const idUsuario = Number(req.params.id_usuario);

    try {
      const [notificaciones] = await pool.query<RowDataPacket[]>(
        `SELECT id_notificacion, id_usuario, titulo, mensaje, leida, fecha
         FROM Notificaciones
         WHERE id_usuario = ? AND leida = FALSE
         ORDER BY fecha DESC`,
        [idUsuario]
      );

      res.json({
        id_usuario: idUsuario,
        total_no_leidas: notificaciones.length,
        notificaciones,
      });
    } catch {
      res.status(500).json({ error: 'Error al obtener notificaciones no leídas' });
    }
  },

  /**
   * Marcar una notificación individual como leída.
   */
  marcarLeida: async (req: Request, res: Response): Promise<void> => {
    const idNotificacion = Number(req.params.id);

    try {
      const [resHeader] = await pool.query<ResultSetHeader>(
        'UPDATE Notificaciones SET leida = TRUE WHERE id_notificacion = ?',
        [idNotificacion]
      );

      if (resHeader.affectedRows === 0) {
        res.status(404).json({ error: 'Notificación no encontrada' });
        return;
      }

      res.json({
        mensaje: 'Notificación marcada como leída',
        id_notificacion: idNotificacion,
      });
    } catch {
      res.status(500).json({ error: 'Error al marcar notificación como leída' });
    }
  },

  /**
   * Marcar todas las notificaciones pendientes de un usuario como leídas.
   */
  marcarTodasLeidas: async (req: Request, res: Response): Promise<void> => {
    const idUsuario = Number(req.params.id_usuario);

    try {
      const [resHeader] = await pool.query<ResultSetHeader>(
        'UPDATE Notificaciones SET leida = TRUE WHERE id_usuario = ? AND leida = FALSE',
        [idUsuario]
      );

      res.json({
        mensaje: 'Todas las notificaciones han sido marcadas como leídas',
        id_usuario: idUsuario,
        total_actualizadas: resHeader.affectedRows,
      });
    } catch {
      res.status(500).json({ error: 'Error al marcar todas las notificaciones como leídas' });
    }
  },

  /**
   * Emisión de alerta masiva comunitaria ante desastres naturales o emergencias generales (Slide 2 y 5).
   */
  emitirAlertaComunitaria: async (req: Request, res: Response): Promise<void> => {
    const { titulo, mensaje, rol_destinatario } = req.body;

    if (!titulo || !mensaje) {
      res.status(400).json({
        error: 'Los campos "titulo" y "mensaje" son obligatorios para emitir la alerta',
      });
      return;
    }

    try {
      let queryUsuarios = 'SELECT id_usuario FROM Usuarios WHERE estado = "ACTIVO"';
      const params: any[] = [];

      if (rol_destinatario) {
        queryUsuarios += ' AND rol = ?';
        params.push(rol_destinatario);
      }

      const [usuarios] = await pool.query<RowDataPacket[]>(queryUsuarios, params);

      if (usuarios.length === 0) {
        res.status(404).json({ error: 'No se encontraron usuarios activos para recibir la alerta' });
        return;
      }

      // Inserción en lote de notificaciones
      const values = usuarios.map((u) => [u.id_usuario, titulo, mensaje, false]);
      await pool.query(
        'INSERT INTO Notificaciones (id_usuario, titulo, mensaje, leida) VALUES ?',
        [values]
      );

      res.status(201).json({
        mensaje: 'Alerta comunitaria emitida exitosamente',
        titulo_alerta: titulo,
        total_usuarios_alertados: usuarios.length,
        destinatarios: rol_destinatario ? `Rol: ${rol_destinatario}` : 'Todos los usuarios activos',
      });
    } catch (error: any) {
      console.error('Error al emitir alerta comunitaria:', error);
      res.status(500).json({ error: 'Error al emitir alerta comunitaria' });
    }
  },
};
