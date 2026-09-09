import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import app from '../src/app.js';
import { pool } from '../src/config/database.js';
import { poblarDatosIniciales } from '../src/config/seed.js';

let server: Server;
let baseUrl: string;

before(async () => {
  // Asegurar que existan datos iniciales
  await poblarDatosIniciales();

  // Levantar servidor en puerto efímero para pruebas
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) {
        baseUrl = `http://localhost:${addr.port}/api`;
      }
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await pool.end();
});

test('1. [SYNC] GET /api/sync/datos-offline entrega catálogo de emergencia y protocolos', async () => {
  const res = await fetch(`${baseUrl}/sync/datos-offline?id_usuario=3`);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(Array.isArray(data.tipos_emergencia));
  assert.ok(data.tipos_emergencia.length > 0);
  assert.ok(Array.isArray(data.instituciones_auxilio));
  assert.ok(data.instituciones_auxilio.length > 0);
  assert.ok(Array.isArray(data.protocolos_emergencia));
  assert.ok(data.protocolos_emergencia.length >= 3);
  assert.ok(data.fecha_descarga);
});

test('2. [SYNC] POST /api/sync/batch procesa lote de cola offline con resolución de IDs temporales', async () => {
  const lotePayload = {
    id_usuario: 3,
    operaciones: [
      {
        temp_id: 'temp-emergencia-offline-101',
        tipo_operacion: 'CREAR_EMERGENCIA',
        payload: {
          id_tipo: 1,
          titulo: 'Choque múltiple en carretera rural sin señal',
          descripcion: 'Dos vehículos colisionaron en zona montañosa sin cobertura.',
          latitud: 14.6500,
          longitud: -90.5200,
          direccion: 'Km 38 Carretera a San Juan',
        },
      },
      {
        temp_id: 'temp-evidencia-offline-102',
        tipo_operacion: 'SUBIR_EVIDENCIA',
        payload: {
          id_emergencia: 'temp-emergencia-offline-101',
          url_imagen: 'https://offlineaid.test/fotos/choque1.jpg',
        },
      },
      {
        temp_id: 'temp-ubicacion-offline-103',
        tipo_operacion: 'ACTUALIZAR_UBICACION',
        payload: {
          id_emergencia: 'temp-emergencia-offline-101',
          latitud: 14.6515,
          longitud: -90.5210,
          direccion: 'Km 38.5 Carretera a San Juan',
        },
      },
    ],
  };

  const res = await fetch(`${baseUrl}/sync/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lotePayload),
  });

  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(data.resumen.total_operaciones, 3);
  assert.equal(data.resumen.sincronizadas, 3);
  assert.equal(data.resumen.con_error, 0);

  const realId = data.mapa_ids_temporales['temp-emergencia-offline-101'];
  assert.ok(realId > 0);

  // Verificar que la emergencia exista y tenga la ubicación actualizada
  const checkEm = await fetch(`${baseUrl}/emergencias/${realId}`);
  assert.equal(checkEm.status, 200);
  const emData = await checkEm.json();
  assert.equal(emData.titulo, 'Choque múltiple en carretera rural sin señal');
  assert.equal(Number(emData.latitud), 14.6515);
});

test('3. [EMERGENCIAS] POST /api/emergencias/reportar crea emergencia integral con evidencias', async () => {
  const payload = {
    id_usuario: 3,
    id_tipo: 2, // Desastre natural
    titulo: 'Deslave bloquea paso comunal',
    descripcion: 'Pared de tierra cayó sobre el camino principal dejando incomunicadas a 15 familias.',
    latitud: 14.6300,
    longitud: -90.5100,
    direccion: 'Caserío El Mirador, Sector 4',
    evidencias: [
      'https://offlineaid.test/evidencias/deslave_1.jpg',
      'https://offlineaid.test/evidencias/deslave_2.jpg',
    ],
  };

  const res = await fetch(`${baseUrl}/emergencias/reportar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.ok(data.id_emergencia > 0);
  assert.equal(data.total_evidencias, 2);
  assert.equal(data.prioridad, 'CRITICA');
});

test('4. [EMERGENCIAS] PATCH /api/emergencias/:id/ubicacion actualiza coordenadas en tiempo real', async () => {
  // Tomar una emergencia activa
  const listRes = await fetch(`${baseUrl}/emergencias/activas`);
  const listData = await listRes.json();
  assert.ok(listData.length > 0);
  const targetId = listData[0].id_emergencia;

  const updateRes = await fetch(`${baseUrl}/emergencias/${targetId}/ubicacion`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitud: 14.6410,
      longitud: -90.5180,
      direccion: 'Nueva ubicación de refugio',
    }),
  });

  assert.equal(updateRes.status, 200);
  const resData = await updateRes.json();
  assert.equal(resData.id_emergencia, targetId);
  assert.equal(resData.latitud, 14.6410);
});

test('5. [EMERGENCIAS] GET /api/emergencias/cercanas filtra con radio en km', async () => {
  const res = await fetch(`${baseUrl}/emergencias/cercanas?latitud=14.64&longitud=-90.51&radio_km=25`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.total_encontradas >= 1);
  assert.ok(data.emergencias_cercanas[0].distancia_km !== undefined);
});

test('6. [EMERGENCIAS] GET /api/emergencias/detalle/:id devuelve vista 360°', async () => {
  const listRes = await fetch(`${baseUrl}/emergencias/activas`);
  const listData = await listRes.json();
  const idEm = listData[0].id_emergencia;

  const res = await fetch(`${baseUrl}/emergencias/detalle/${idEm}`);
  assert.equal(res.status, 200);
  const detalle = await res.json();

  assert.ok(detalle.usuario_nombre);
  assert.ok(detalle.tipo_nombre);
  assert.ok(Array.isArray(detalle.evidencias));
  assert.ok(Array.isArray(detalle.instituciones_asignadas));
});

test('7. [DESPACHO] POST /api/emergencias/:id/asignar asigna institución y notifica', async () => {
  const listRes = await fetch(`${baseUrl}/emergencias/activas`);
  const listData = await listRes.json();
  const idEm = listData[0].id_emergencia;

  const res = await fetch(`${baseUrl}/emergencias/${idEm}/asignar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_institucion: 1 }), // Bomberos Voluntarios
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.estado_asignacion, 'ASIGNADA');
  assert.equal(data.estado_emergencia, 'EN_PROCESO');
  assert.ok(data.id_asignacion > 0);

  // Probar cambio de estado de asignación a FINALIZADA
  const updateAsig = await fetch(`${baseUrl}/asignaciones/${data.id_asignacion}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'FINALIZADA' }),
  });

  assert.equal(updateAsig.status, 200);
  const asigFinData = await updateAsig.json();
  assert.equal(asigFinData.nuevo_estado, 'FINALIZADA');
  assert.equal(asigFinData.emergencia_marcada_atendida, true);
});

test('8. [NOTIFICACIONES] Gestión de alertas comunitarias y bandeja no leídas', async () => {
  // Emitir alerta masiva comunitaria
  const alertaRes = await fetch(`${baseUrl}/notificaciones/alerta-comunitaria`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      titulo: 'Alerta Roja: Frente Frío y Lluvias Intensas',
      mensaje: 'Se prevén inundaciones en áreas bajas. Favor tomar precauciones.',
    }),
  });

  assert.equal(alertaRes.status, 201);
  const alertaData = await alertaRes.json();
  assert.ok(alertaData.total_usuarios_alertados > 0);

  // Consultar no leídas del usuario 3
  const noLeidasRes = await fetch(`${baseUrl}/notificaciones/usuario/3/no-leidas`);
  assert.equal(noLeidasRes.status, 200);
  const noLeidasData = await noLeidasRes.json();
  assert.ok(noLeidasData.total_no_leidas > 0);

  // Marcar una como leída
  const firstNotif = noLeidasData.notificaciones[0];
  const markRes = await fetch(`${baseUrl}/notificaciones/${firstNotif.id_notificacion}/leida`, {
    method: 'PATCH',
  });
  assert.equal(markRes.status, 200);

  // Marcar todas como leídas
  const markAllRes = await fetch(`${baseUrl}/notificaciones/usuario/3/leer-todas`, {
    method: 'PATCH',
  });
  assert.equal(markAllRes.status, 200);
});

test('9. [ESTADÍSTICAS] GET /api/estadisticas/dashboard entrega métricas de impacto y sincro offline', async () => {
  const res = await fetch(`${baseUrl}/estadisticas/dashboard`);
  assert.equal(res.status, 200);
  const dash = await res.json();

  assert.ok(dash.totales_globales.total_emergencias > 0);
  assert.ok(Array.isArray(dash.emergencias_por_estado));
  assert.ok(Array.isArray(dash.emergencias_por_prioridad));
  assert.ok(dash.impacto_sincronizacion_offline);
  assert.ok(Array.isArray(dash.impacto_sincronizacion_offline.resumen_por_estado));
  assert.ok(Array.isArray(dash.actividad_instituciones));
});
