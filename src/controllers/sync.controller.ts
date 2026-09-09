import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';

interface OperacionOffline {
  temp_id?: string;
  tipo_operacion: 'CREAR_EMERGENCIA' | 'ACTUALIZAR_EMERGENCIA' | 'SUBIR_EVIDENCIA' | 'ACTUALIZAR_UBICACION';
  payload: Record<string, any>;
}

// Resuelve si el id de emergencia viene como texto temporal (ej. "temp-01") o número real
function resolverIdEmergencia(id: any, mapaIds: Record<string, number>): number {
  if (typeof id === 'string' && mapaIds[id]) return mapaIds[id];
  return Number(id);
}

// Ejecuta una operación individual de la cola según su tipo
async function ejecutarOperacion(
  op: OperacionOffline,
  idUsuario: number,
  mapaIds: Record<string, number>
) {
  const { temp_id, tipo_operacion, payload } = op;

  switch (tipo_operacion) {
    case 'CREAR_EMERGENCIA': {
      if (!payload.id_tipo || !payload.titulo || !payload.descripcion) {
        throw new Error('id_tipo, titulo y descripcion son obligatorios para crear emergencia');
      }

      const [res] = await pool.query<ResultSetHeader>(
        `INSERT INTO Emergencias (id_usuario, id_tipo, titulo, descripcion, latitud, longitud, direccion, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')`,
        [idUsuario, payload.id_tipo, payload.titulo, payload.descripcion, payload.latitud ?? null, payload.longitud ?? null, payload.direccion ?? null]
      );

      const nuevoId = res.insertId;
      if (temp_id) mapaIds[temp_id] = nuevoId;

      await pool.query(
        'INSERT INTO Notificaciones (id_usuario, titulo, mensaje) VALUES (?, ?, ?)',
        [idUsuario, 'Emergencia Sincronizada', `Tu reporte de emergencia "${payload.titulo}" generado offline ha sido recibido y registrado en el servidor.`]
      );

      return { id_emergencia: nuevoId, mensaje: 'Emergencia creada exitosamente desde la cola offline' };
    }

    case 'ACTUALIZAR_EMERGENCIA': {
      const idEmergencia = resolverIdEmergencia(payload.id_emergencia, mapaIds);
      if (!idEmergencia) throw new Error('No se pudo determinar el id_emergencia a actualizar');

      await pool.query(
        'UPDATE Emergencias SET titulo = COALESCE(?, titulo), descripcion = COALESCE(?, descripcion), estado = COALESCE(?, estado) WHERE id_emergencia = ?',
        [payload.titulo ?? null, payload.descripcion ?? null, payload.estado ?? null, idEmergencia]
      );

      return { id_emergencia: idEmergencia, mensaje: 'Emergencia actualizada exitosamente' };
    }

    case 'SUBIR_EVIDENCIA': {
      const idEmergencia = resolverIdEmergencia(payload.id_emergencia, mapaIds);
      if (!idEmergencia || !payload.url_imagen) {
        throw new Error('id_emergencia y url_imagen son obligatorios para la evidencia');
      }

      await pool.query(
        'INSERT INTO Evidencias (id_emergencia, url_imagen) VALUES (?, ?)',
        [idEmergencia, payload.url_imagen]
      );

      return { id_emergencia: idEmergencia, mensaje: 'Evidencia asociada exitosamente' };
    }

    case 'ACTUALIZAR_UBICACION': {
      const idEmergencia = resolverIdEmergencia(payload.id_emergencia, mapaIds);
      if (!idEmergencia || payload.latitud === undefined || payload.longitud === undefined) {
        throw new Error('id_emergencia, latitud y longitud son requeridas para actualizar ubicación');
      }

      await pool.query(
        'UPDATE Emergencias SET latitud = ?, longitud = ?, direccion = COALESCE(?, direccion) WHERE id_emergencia = ?',
        [payload.latitud, payload.longitud, payload.direccion ?? null, idEmergencia]
      );

      return { id_emergencia: idEmergencia, mensaje: 'Ubicación actualizada exitosamente desde la cola' };
    }

    default:
      throw new Error(`Tipo de operación no soportado: ${tipo_operacion}`);
  }
}

export const syncController = {
  /**
   * Sincronización masiva automática cuando el dispositivo recupera conexión.
   */
  sincronizarLote: async (req: Request, res: Response): Promise<void> => {
    const { id_usuario, operaciones } = req.body as {
      id_usuario?: number;
      operaciones?: OperacionOffline[];
    };

    if (!id_usuario || !Array.isArray(operaciones) || operaciones.length === 0) {
      res.status(400).json({ error: 'Debe proporcionar un "id_usuario" válido y un arreglo de "operaciones"' });
      return;
    }

    const [usuarios] = await pool.query<RowDataPacket[]>('SELECT id_usuario FROM Usuarios WHERE id_usuario = ?', [id_usuario]);
    if (usuarios.length === 0) {
      res.status(404).json({ error: 'El usuario especificado no existe' });
      return;
    }

    const mapaIds: Record<string, number> = {};
    const resultados: any[] = [];
    let sincronizadas = 0;
    let conError = 0;

    for (const op of operaciones) {
      const { temp_id, tipo_operacion, payload } = op;
      let idCola = 0;

      try {
        const [colaRes] = await pool.query<ResultSetHeader>(
          'INSERT INTO ColaOffline (id_usuario, tipo_operacion, payload_json, estado_sync) VALUES (?, ?, ?, "PENDIENTE")',
          [id_usuario, tipo_operacion, JSON.stringify(payload || {})]
        );
        idCola = colaRes.insertId;

        const detalle = await ejecutarOperacion(op, id_usuario, mapaIds);
        await pool.query('UPDATE ColaOffline SET estado_sync = "SINCRONIZADO", fecha_sync = CURRENT_TIMESTAMP WHERE id_cola = ?', [idCola]);

        resultados.push({ id_cola: idCola, temp_id, tipo_operacion, estado: 'SINCRONIZADO', ...detalle });
        sincronizadas++;
      } catch (err: any) {
        if (idCola > 0) {
          await pool.query('UPDATE ColaOffline SET estado_sync = "ERROR", mensaje_error = ? WHERE id_cola = ?', [err.message, idCola]);
        }
        resultados.push({ id_cola: idCola, temp_id, tipo_operacion, estado: 'ERROR', error: err.message });
        conError++;
      }
    }

    res.json({
      mensaje: 'Proceso de sincronización automática finalizado',
      resumen: { total_operaciones: operaciones.length, sincronizadas, con_error: conError },
      mapa_ids_temporales: mapaIds,
      detalles: resultados,
    });
  },

  /**
   * Provee el paquete de datos esencial para que la app funcione sin conexión.
   */
  obtenerDatosOffline: async (req: Request, res: Response): Promise<void> => {
    try {
      const idUsuario = req.query.id_usuario ? Number(req.query.id_usuario) : null;

      const [tipos] = await pool.query<RowDataPacket[]>('SELECT id_tipo, nombre, descripcion, nivel_prioridad FROM TiposEmergencia ORDER BY id_tipo ASC');
      const [instituciones] = await pool.query<RowDataPacket[]>('SELECT id_institucion, nombre, tipo, telefono, correo, direccion FROM Instituciones ORDER BY nombre ASC');

      const protocolos = [
        {
          titulo: 'Protocolo ante Terremoto / Sismo',
          pasos: [
            'Mantén la calma y ubícate en una zona segura o bajo una estructura resistente.',
            'Aléjate de ventanas, repisas y cables eléctricos.',
            'Cierra llaves de gas y agua si es seguro hacerlo.',
            'Reporta en OfflineAid tu ubicación tan pronto estés a salvo.',
          ],
        },
        {
          titulo: 'Primeros Auxilios Básicos en Zona Rural',
          pasos: [
            'Evalúa signos vitales (respiración y pulso).',
            'En caso de hemorragia, aplica presión directa con una tela limpia.',
            'No muevas a una persona con sospecha de lesión en cuello o columna.',
            'Registra en OfflineAid las evidencias para que los paramédicos tengan contexto previo.',
          ],
        },
        {
          titulo: 'Inundaciones y Deslaves',
          pasos: [
            'Evacúa inmediatamente hacia terrenos altos.',
            'Evita cruzar corrientes de agua a pie o en vehículo.',
            'Desconecta la energía eléctrica de la vivienda.',
          ],
        },
      ];

      let emergenciasUsuario: any[] = [];
      if (idUsuario) {
        const [filas] = await pool.query<RowDataPacket[]>(
          `SELECT e.*, t.nombre AS tipo_nombre, t.nivel_prioridad
           FROM Emergencias e
           INNER JOIN TiposEmergencia t ON e.id_tipo = t.id_tipo
           WHERE e.id_usuario = ? ORDER BY e.fecha_creacion DESC`,
          [idUsuario]
        );
        emergenciasUsuario = filas;
      }

      res.json({
        mensaje: 'Paquete de datos offline generado exitosamente',
        fecha_descarga: new Date().toISOString(),
        tipos_emergencia: tipos,
        instituciones_auxilio: instituciones,
        protocolos_emergencia: protocolos,
        emergencias_usuario: emergenciasUsuario,
      });
    } catch {
      res.status(500).json({ error: 'Error al generar el paquete de datos offline' });
    }
  },

  /**
   * Reintenta procesar un elemento de la cola que quedó en estado ERROR o PENDIENTE.
   */
  reintentarCola: async (req: Request, res: Response): Promise<void> => {
    const idCola = Number(req.params.id);

    try {
      const [filas] = await pool.query<RowDataPacket[]>('SELECT * FROM ColaOffline WHERE id_cola = ?', [idCola]);
      if (filas.length === 0) {
        res.status(404).json({ error: 'Registro en cola no encontrado' });
        return;
      }

      const item = filas[0];
      if (item.estado_sync === 'SINCRONIZADO') {
        res.status(400).json({ mensaje: 'Este registro ya fue sincronizado previamente' });
        return;
      }

      const payload = typeof item.payload_json === 'string' ? JSON.parse(item.payload_json) : item.payload_json;
      const mapaIds: Record<string, number> = {};
      const resultado = await ejecutarOperacion(
        { tipo_operacion: item.tipo_operacion, payload },
        item.id_usuario,
        mapaIds
      );

      await pool.query(
        'UPDATE ColaOffline SET estado_sync = "SINCRONIZADO", mensaje_error = NULL, fecha_sync = CURRENT_TIMESTAMP WHERE id_cola = ?',
        [idCola]
      );

      res.json({ ...resultado, mensaje: 'Elemento de cola reintentado y sincronizado exitosamente' });
    } catch (error: any) {
      await pool.query('UPDATE ColaOffline SET estado_sync = "ERROR", mensaje_error = ? WHERE id_cola = ?', [error.message, idCola]);
      res.status(500).json({ error: `Error al reintentar elemento de cola: ${error.message}` });
    }
  },

  /**
   * Consulta los registros pendientes o fallidos en la cola offline.
   */
  obtenerPendientesCola: async (_req: Request, res: Response): Promise<void> => {
    try {
      const [pendientes] = await pool.query<RowDataPacket[]>(
        `SELECT c.*, u.nombre AS usuario_nombre, u.correo AS usuario_correo
         FROM ColaOffline c
         INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
         WHERE c.estado_sync IN ('PENDIENTE', 'ERROR')
         ORDER BY c.fecha_creacion ASC`
      );
      res.json(pendientes);
    } catch {
      res.status(500).json({ error: 'Error al consultar la cola offline' });
    }
  },
};
