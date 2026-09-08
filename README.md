# Backend-OfflineAID
API REST de OfflineAid con TypeScript, Express y MySQL.

## Instalacion

1. Ejecuta `script.sql` en MySQL.
2. Copia `.env.example` como `.env` y configura MySQL.
3. Ejecuta `pnpm install`, luego `pnpm run build` y `pnpm start`.

La API queda disponible en `http://localhost:3000`.

## Endpoints CRUD

Todas tienen `POST`, `GET`, `GET/:id`, `PUT/:id` y `DELETE/:id`:

- `/api/usuarios`
- `/api/tipos-emergencia`
- `/api/emergencias`
- `/api/evidencias`
- `/api/instituciones`
- `/api/asignaciones`
- `/api/notificaciones`
- `/api/cola-offline`

En Postman usa `Body > raw > JSON`. Ejemplo para crear una emergencia:

```json
{
	"id_usuario": 1,
	"id_tipo": 1,
	"titulo": "Accidente de transito",
	"descripcion": "Accidente en la avenida principal",
	"latitud": 14.6349,
	"longitud": -90.5069,
	"direccion": "Avenida principal"
}
```
