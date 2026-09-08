import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database.js';

type Value = string | number | boolean | object | null;

export function crearCrud(tabla: string, idCampo: string, columnas: string[]) {
  return {
    obtenerTodos: async (_req: Request, res: Response) => {
      try {
        const [filas] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tabla}`);
        res.json(filas);
      } catch {
        res.status(500).json({ error: 'Error al obtener los registros' });
      }
    },
    obtenerPorId: async (req: Request, res: Response) => {
      try {
        const [filas] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${tabla} WHERE ${idCampo} = ?`, [req.params.id]);
        if (filas.length === 0) {
          res.status(404).json({ error: 'Registro no encontrado' });
          return;
        }
        res.json(filas[0]);
      } catch {
        res.status(500).json({ error: 'Error al obtener el registro' });
      }
    },
    crear: async (req: Request, res: Response) => {
      try {
        const datos = seleccionarColumnas(req.body, columnas);
        const nombres = Object.keys(datos);
        if (nombres.length === 0) {
          res.status(400).json({ error: 'Debe enviar datos para crear el registro' });
          return;
        }
        const [resultado] = await pool.query<ResultSetHeader>(
          `INSERT INTO ${tabla} (${nombres.join(', ')}) VALUES (${nombres.map(() => '?').join(', ')})`,
          nombres.map((nombre) => datos[nombre]),
        );
        res.status(201).json({ id: resultado.insertId, mensaje: 'Registro creado correctamente' });
      } catch (error) {
        console.error('Error al crear registro:', error);
        res.status(400).json({ error: 'No se pudo crear el registro' });
      }
    },
    actualizar: async (req: Request, res: Response) => {
      try {
        const datos = seleccionarColumnas(req.body, columnas);
        const nombres = Object.keys(datos);
        if (nombres.length === 0) {
          res.status(400).json({ error: 'Debe enviar datos para actualizar el registro' });
          return;
        }
        const [resultado] = await pool.query<ResultSetHeader>(
          `UPDATE ${tabla} SET ${nombres.map((nombre) => `${nombre} = ?`).join(', ')} WHERE ${idCampo} = ?`,
          [...nombres.map((nombre) => datos[nombre]), req.params.id],
        );
        if (resultado.affectedRows === 0) {
          res.status(404).json({ error: 'Registro no encontrado' });
          return;
        }
        res.json({ mensaje: 'Registro actualizado correctamente' });
      } catch {
        res.status(400).json({ error: 'No se pudo actualizar el registro' });
      }
    },
    eliminar: async (req: Request, res: Response) => {
      try {
        const [resultado] = await pool.query<ResultSetHeader>(`DELETE FROM ${tabla} WHERE ${idCampo} = ?`, [req.params.id]);
        if (resultado.affectedRows === 0) {
          res.status(404).json({ error: 'Registro no encontrado' });
          return;
        }
        res.json({ mensaje: 'Registro eliminado correctamente' });
      } catch {
        res.status(400).json({ error: 'No se pudo eliminar el registro' });
      }
    },
  };
}

function seleccionarColumnas(cuerpo: Record<string, Value> = {}, columnas: string[]) {
  return Object.fromEntries(
    columnas.filter((columna) => cuerpo[columna] !== undefined).map((columna) => [columna, cuerpo[columna]]),
  ) as Record<string, Value>;
}