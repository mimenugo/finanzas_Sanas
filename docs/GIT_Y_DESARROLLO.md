# Git y desarrollo del proyecto

## Recomendacion

Para este proyecto conviene trabajar con:

- Visual Studio Code como editor principal.
- Git para control de versiones.
- GitHub, GitLab o Bitbucket como repositorio remoto privado.
- VPS para produccion cuando el sistema este listo.

## Flujo local recomendado

1. Abrir el proyecto en VS Code:

```bash
code C:\laragon\www\Credito
```

2. Iniciar Laragon/MySQL.

3. Ejecutar el archivo:

```bash
iniciar_credito.bat
```

4. Trabajar cambios en ramas:

```bash
git checkout -b feature/mis-pagos
```

5. Revisar cambios antes de guardarlos:

```bash
git status
git diff
```

6. Guardar cambios:

```bash
git add .
git commit -m "Mejorar portal Mis Pagos"
```

## Archivos que no se deben subir

No subir:

- `.env`
- logs
- `node_modules`
- `source/server/uploads`
- archivos con llaves de Stripe, Google Drive, JWT o base de datos

Usar los archivos `.env.example` como plantilla.

## Preparacion para VPS

En produccion se necesitara:

- Dominio con HTTPS.
- Base de datos MySQL en servidor.
- Variables `.env` reales del backend.
- `CLIENT_URL` apuntando al dominio real.
- Webhook real de Stripe:

```text
https://tu-dominio.com/api/payment-collections/webhooks/STRIPE
```

- Proceso Node administrado con PM2 o servicio equivalente.
- Respaldos automaticos de MySQL y uploads.

## VS Code recomendado

Extensiones utiles:

- ESLint
- Prettier
- Prisma
- GitLens
- DotENV

La forma mas sencilla para el dia a dia es usar la pestaña Source Control de VS Code para ver cambios, crear commits y sincronizar con el repositorio remoto.

## Preparacion inicial para GitHub

Antes del primer commit:

1. Confirmar que estos archivos existen y se mantienen sin secretos reales:

```bash
source/server/.env.example
source/client/.env.example
.gitignore
.gitattributes
```

2. Confirmar que estos archivos locales no se van a subir:

```bash
git status --ignored
```

3. Revisar especificamente que no aparezcan como archivos para agregar:

```text
source/server/.env
source/client/.env
source/server/uploads/
node_modules/
source/client/dist/
*.log
client_secret*.json
portal-cliente-*.json
secreto.txt
```

4. Crear el primer commit local:

```bash
git add .
git status
git commit -m "Preparar proyecto Finanzas Sanas para Git"
```

5. Crear un repositorio privado en GitHub y conectar el remoto:

```bash
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

## Variables de entorno

El backend usa `source/server/.env` para configuracion local. Ese archivo no se sube a Git. Para una nueva maquina o servidor:

1. Copiar `source/server/.env.example` a `source/server/.env`.
2. Cambiar `DATABASE_URL`, secretos JWT, `CLIENT_URL` y demas valores del ambiente.
3. Copiar `source/client/.env.example` a `source/client/.env`.
4. Ajustar `VITE_API_URL` segun el dominio o localhost.

Stripe, SMTP, Google Sheets OAuth, cuentas bancarias y pasarelas se configuran desde el panel de administracion y se guardan en la base de datos. Aun asi, sus llaves, webhooks, certificados y secretos no deben escribirse en archivos versionados.

## Comandos utiles

Ver cambios pendientes:

```bash
git status
```

Ver archivos ignorados:

```bash
git status --ignored
```

Ver detalle de cambios:

```bash
git diff
```

Ver historial:

```bash
git log --oneline --decorate --graph -10
```
