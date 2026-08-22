# Despliegue en servidor

## Estado recomendado

El proyecto se publica como dos servicios:

- Backend: `source/server`
- Frontend: `source/client`
- Base de datos: MySQL administrado por el proveedor o por el VPS.

## Variables del backend

Crear estas variables en el panel del servidor:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
JWT_ACCESS_SECRET=generar-un-secreto-largo
JWT_REFRESH_SECRET=generar-otro-secreto-largo
JWT_SECRET=generar-un-secreto-largo-compatibilidad
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
PORT=5000
NODE_ENV=production
CLIENT_URL=https://tu-dominio.com
API_PUBLIC_URL=https://api.tu-dominio.com
MAX_FILE_SIZE=7340032
GOOGLE_DRIVE_CLIENT_EMAIL=
GOOGLE_DRIVE_PRIVATE_KEY=
GOOGLE_DRIVE_FOLDER_ID=
```

`CLIENT_URL` puede aceptar varias URLs separadas por coma.

## Variables del frontend

```env
VITE_API_URL=https://api.tu-dominio.com/api
```

## Comandos backend

Directorio raiz del servicio:

```text
source/server
```

Build:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
```

Start:

```bash
npm start
```

## Comandos frontend

Directorio raiz del servicio:

```text
source/client
```

Build:

```bash
npm ci
npm run build
```

El resultado queda en:

```text
source/client/dist
```

Ese directorio se puede publicar como sitio estatico en Railway, VPS con Nginx, Hostinger Node/static, Netlify, Vercel o Cloudflare Pages.

## Stripe

Una vez publicado el backend, configurar en Stripe el webhook:

```text
https://api.tu-dominio.com/api/payment-collections/webhooks/STRIPE
```

El `Webhook Secret` que genera Stripe debe guardarse en:

```text
Pagos y Cobranza > Pasarelas > Stripe
```

## Google Sheets OAuth

En Google Cloud agregar como redirect URI autorizado:

```text
https://api.tu-dominio.com/api/settings/google-sheets/oauth/callback
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
