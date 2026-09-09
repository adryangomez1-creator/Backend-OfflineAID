# Backend-OfflineAID
API REST de OfflineAid desarrollada con TypeScript, Express y MySQL.

Sistema de asistencia y respuesta ante emergencias para situaciones sin conexión a internet (desastres naturales, zonas rurales, apagones), con sincronización automática en cola cuando se restablece la red.

---

## Instalación y Configuración

1. Ejecuta `script.sql` en MySQL para crear la base de datos `offlineaid_in5bm` y sus 8 entidades.
2. Configura tu archivo `.env` con las credenciales de tu base de datos:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=tu_password
   DB_NAME=offlineaid_in5bm
   ```
3. Instala dependencias:
   ```bash
   pnpm install
   ```
4. Puebla los catálogos y datos iniciales de prueba (tipos de emergencia, instituciones de auxilio y usuarios):
   ```bash
   pnpm run seed
   ```
5. Compila y arranca el servidor:
   ```bash
   pnpm run build
   pnpm start
   ```
   *O en modo desarrollo:* `pnpm run dev`

La API queda disponible en `http://localhost:3000`.

---

## Fases del Proyecto

- **Fase 1**: Definición de entidades, interfaces TypeScript y esquema relacional MySQL.
- **Fase 2**: CRUDs genéricos para cada una de las 8 entidades.
- **Fase 3**: Métodos especiales de lógica de negocio (Sincronización masiva offline, geolocalización, despacho institucional, alertas comunitarias y dashboard de impacto).

---

## Endpoints de la Fase 3 (Métodos Especiales)

### 1. Sincronización Offline (`/api/sync` y `/api/cola-offline`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/sync/batch` | Sincronización masiva automática desde el dispositivo. Procesa en lote reportes, evidencias y cambios de ubicación creados sin internet, resolviendo IDs temporales. |
| `GET` | `/api/sync/datos-offline` | Descarga el paquete de datos esenciales (catálogo de emergencias, directorio de auxilio y protocolos de primeros auxilios) para que la app funcione offline. Permite opcionalmente `?id_usuario=X`. |
| `GET` | `/api/cola-offline/pendientes` | Lista las operaciones pendientes o fallidas en la cola de sincronización. |
| `POST` | `/api/cola-offline/:id/reintentar` | Reintenta procesar un elemento de la cola que quedó en estado `ERROR` o `PENDIENTE`. |

#### Ejemplo de `POST /api/sync/batch`:
```json
{
  "id_usuario": 3,
  "operaciones": [
    {
      "temp_id": "temp-001",
      "tipo_operacion": "CREAR_EMERGENCIA",
      "payload": {
        "id_tipo": 1,
        "titulo": "Choque vial en tramo sin señal",
        "descripcion": "Vehículo volcado al fondo del barranco",
        "latitud": 14.6500,
        "longitud": -90.5200,
        "direccion": "Km 34 Ruta hacia San Raymundo"
      }
    },
    {
      "tipo_operacion": "SUBIR_EVIDENCIA",
      "payload": {
        "id_emergencia": "temp-001",
        "url_imagen": "https://storage.offlineaid.org/fotos/choque.jpg"
      }
    }
  ]
}
```

---

### 2. Emergencias y Geolocalización (`/api/emergencias`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/emergencias/reportar` | Reporte integral de emergencia con evidencias fotográficas adjuntas en una sola llamada y notificación automática. |
| `PATCH` | `/api/emergencias/:id/ubicacion` | Guarda y actualiza las coordenadas (`latitud`, `longitud`) y dirección de una emergencia activa. |
| `PATCH` | `/api/emergencias/:id/estado` | Cambia el estado del ciclo de vida (`PENDIENTE`, `EN_PROCESO`, `ATENDIDA`, `CANCELADA`). Al atenderla, finaliza asignaciones activas. |
| `GET` | `/api/emergencias/activas` | Emergencias en curso priorizadas (`CRITICA`, `ALTA`, `MEDIA`, `BAJA`) para centros de monitoreo. |
| `GET` | `/api/emergencias/cercanas` | Búsqueda geoespacial por radio en km (`?latitud=14.64&longitud=-90.51&radio_km=15`) usando la fórmula Haversine. |
| `GET` | `/api/emergencias/detalle/:id` | Vista 360° con datos del usuario, tipo, evidencias e instituciones asignadas. |
| `GET` | `/api/emergencias/usuario/:id_usuario` | Historial de emergencias de un ciudadano particular. |

---

### 3. Asignaciones y Despacho Institucional (`/api/asignaciones` e `/api/instituciones`)

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/emergencias/:id/asignar` | Despacha y asigna una institución (Bomberos, Cruz Roja, etc.), cambia la emergencia a `EN_PROCESO` y notifica al usuario. |
| `PATCH` | `/api/asignaciones/:id/estado` | Actualiza la atención institucional (`ASIGNADA`, `EN_PROCESO`, `FINALIZADA`). Si concluyen todas, marca la emergencia como `ATENDIDA`. |
| `GET` | `/api/instituciones/:id/emergencias` | Emergencias asignadas a una institución (filtrable por `?estado=...`). |

---

### 4. Notificaciones y Alertas Comunitarias (`/api/notificaciones`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/notificaciones/usuario/:id_usuario/no-leidas` | Consulta la bandeja de notificaciones pendientes del usuario. |
| `PATCH` | `/api/notificaciones/:id/leida` | Marca una notificación específica como leída. |
| `PATCH` | `/api/notificaciones/usuario/:id_usuario/leer-todas` | Marca todas las notificaciones pendientes del usuario como leídas. |
| `POST` | `/api/notificaciones/alerta-comunitaria` | Emite una alerta comunitaria masiva ante desastres naturales a todos los usuarios activos o por rol (`ADMIN`, `OPERADOR`, `CIUDADANO`). |

---

### 5. Estadísticas e Impacto de OfflineAid (`/api/estadisticas`)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/estadisticas/dashboard` | Tablero de métricas de impacto: total de emergencias por estado y prioridad, tasa de efectividad de la sincronización offline e instituciones más activas. |

---

## Endpoints CRUD de Fase 2

Todas las entidades mantienen sus endpoints básicos en `/api`:
- `GET /api/{entidad}`
- `GET /api/{entidad}/:id`
- `POST /api/{entidad}`
- `PUT /api/{entidad}/:id`
- `DELETE /api/{entidad}/:id`

Entidades registradas:
- `/api/usuarios`
- `/api/tipos-emergencia`
- `/api/emergencias`
- `/api/evidencias`
- `/api/instituciones`
- `/api/asignaciones`
- `/api/notificaciones`
- `/api/cola-offline`

---

## Pruebas Automatizadas

Ejecuta la suite completa de pruebas:
```bash
pnpm test
```
