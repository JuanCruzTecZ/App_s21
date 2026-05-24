# Portal de Asistencia Especializada

Portal multi-tenant para ONGs con:

- frontend en React + Vite
- backend propio en Node + Express
- base local SQLite
- notificaciones de Telegram enviadas desde backend
- despliegue en un solo contenedor Docker

## Arquitectura

- `src/`: interfaz publica y panel administrador
- `server/`: API, autenticacion, sesiones, SQLite y seguridad
- `data/`: base SQLite persistida
- `uploads/`: adjuntos de solicitudes

## Flujo funcional

1. La primera vez se abre `http://localhost:3000/admin/login`.
2. Si el sistema no fue inicializado, aparece el formulario de configuracion inicial.
3. Se crea la primera ONG y el primer usuario `superadmin`.
4. Desde el panel se pueden:
   - editar nombre y slug de la ONG
   - crear nuevas ONGs
   - asignar mail y contrasena de cada administrador
   - configurar token y chat ID de Telegram
   - crear y editar consultorias
   - recibir y gestionar solicitudes con estados `pendiente`, `en_proceso` y `finalizada`

## Seguridad aplicada

- contrasenas hasheadas con `bcrypt` (`12` rondas)
- sesiones con cookie `HttpOnly`, `SameSite=Strict` y expiracion
- tokens de sesion aleatorios guardados hasheados en SQLite
- token de Telegram cifrado en base con `AES-256-GCM`
- `helmet` para endurecer cabeceras HTTP
- rate limiting para login, setup inicial, envios publicos y API general
- validacion y normalizacion de entradas del usuario
- limite de tamano y tipos permitidos en adjuntos
- verificacion de origen para bloquear POST cross-site
- queries parametrizadas, sin SQL concatenado

## Variables de entorno

Copiar `.env.example` como `.env` si quieres personalizar:

```env
PORT=3000
APP_SECRET=change-this-secret-before-production
DB_PATH=/app/data/portal.sqlite
```

`APP_SECRET` debe cambiarse antes de produccion. Se usa para cifrar secretos y firmar el contexto de sesion.

## Desarrollo local

En una terminal:

```bash
npm install
npm run dev:server
```

En otra terminal:

```bash
npm run dev
```

- frontend: `http://localhost:5173`
- API/backend: `http://localhost:3000`

Vite ya proxya `/api` al backend.

## Build local

```bash
npm run build
npm run start
```

Luego abrir `http://localhost:3000`.

## Docker

```bash
docker compose up --build
```

Luego abrir `http://localhost:3000`.

La informacion queda persistida en los volumenes:

- `portal_data`
- `portal_uploads`

## Recomendaciones para entrega

- cambiar `APP_SECRET` en `docker-compose.yml`
- si usas un bot real, cargar el token desde el panel y no dejarlo en archivos
- crear un usuario superadmin fuerte durante la configuracion inicial
- si vas a exponer el sistema a internet, ponerlo detras de HTTPS y reverse proxy
