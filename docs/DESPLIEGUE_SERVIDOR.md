# Despliegue en servidor

## Estado recomendado

En Railway el proyecto se publica como tres servicios dentro del mismo proyecto:

- Backend: `source/server`
- Frontend: `source/client`
- Base de datos: MySQL de Railway

Railway permite definir comandos de build/start desde el panel o desde archivos de configuracion del repo. Para este proyecto ya se agrego:

```text
source/server/railway.json
source/client/Dockerfile
source/client/Caddyfile
```

El frontend usa Caddy para servir el `dist` de Vite y resolver rutas internas como `/login`, `/dashboard` y `/mis-pagos`.

## Pasos en Railway

1. Crear un proyecto nuevo en Railway.
2. Agregar una base de datos MySQL:

```text
+ New > Database > MySQL
```

3. Agregar servicio backend desde GitHub:

```text
+ New > GitHub Repo > mimenugo/finanzas_Sanas
```

Configurar:

```text
Root Directory: /source/server
Config File Path: /source/server/railway.json
```

4. Agregar servicio frontend desde el mismo GitHub:

```text
+ New > GitHub Repo > mimenugo/finanzas_Sanas
```

Configurar:

```text
Root Directory: /source/client
```

Railway detectara el `Dockerfile` del frontend.

5. Generar dominio publico para backend y frontend en:

```text
Service > Settings > Networking > Public Networking
```

6. Regresar a Variables y ajustar las URLs publicas.

## Variables del backend

Crear estas variables en el panel del servidor:

```env
DATABASE_URL=${{MySQL.MYSQL_URL}}
JWT_ACCESS_SECRET=generar-un-secreto-largo
JWT_REFRESH_SECRET=generar-otro-secreto-largo
JWT_SECRET=generar-un-secreto-largo-compatibilidad
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
PORT=5000
NODE_ENV=production
CLIENT_URL=https://frontend-production.up.railway.app
API_PUBLIC_URL=https://backend-production.up.railway.app
MAX_FILE_SIZE=7340032
GOOGLE_DRIVE_CLIENT_EMAIL=
GOOGLE_DRIVE_PRIVATE_KEY=
GOOGLE_DRIVE_FOLDER_ID=
```

`CLIENT_URL` puede aceptar varias URLs separadas por coma.

## Variables del frontend

```env
VITE_API_URL=https://backend-production.up.railway.app/api
```

En Railway, `VITE_API_URL` debe existir antes de construir el frontend porque Vite la integra durante el build.

## Comandos backend

Si Railway no toma el archivo `railway.json`, configurar manualmente:

```text
Root Directory: /source/server
Build Command: npm ci && npx prisma generate
Pre-Deploy Command: npx prisma migrate deploy
Start Command: npm start
Healthcheck Path: /health
```

## Comandos frontend

El frontend usa:

```text
Root Directory: /source/client
Dockerfile: /source/client/Dockerfile
```

## Stripe

Una vez publicado el backend, configurar en Stripe el webhook:

```text
https://backend-production.up.railway.app/api/payment-collections/webhooks/STRIPE
```

El `Webhook Secret` que genera Stripe debe guardarse en:

```text
Pagos y Cobranza > Pasarelas > Stripe
```

## Google Sheets OAuth

En Google Cloud agregar como redirect URI autorizado:

```text
https://backend-production.up.railway.app/api/settings/google-sheets/oauth/callback
```

En el panel del sistema:

```text
Configuracion > Google Sheets
```

guardar Client ID, Client Secret, Redirect URI, Spreadsheet ID y rango.

## Archivos privados

No subir ni copiar al repositorio:

- `.env`
- credenciales JSON
- certificados
- logs
- `node_modules`
- `dist`
- `source/server/uploads`

Para produccion, los archivos subidos por clientes deben guardarse en Google Drive, S3, Cloudflare R2 o un volumen persistente del servidor.
