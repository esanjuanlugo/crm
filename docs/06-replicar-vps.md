# Replicar el CRM en varios VPS (cada uno con sus dominios)

Esta guía es para levantar **otra instalación completa** del CRM en un VPS nuevo,
con sus propios dominios, y para mantener todas al día sin sorpresas.

## Cómo está armado cada VPS

Un VPS = una instalación independiente. No comparten base de datos, usuarios ni secretos.

```
VPS
└─ Docker
   ├─ Caddy ........ HTTPS automático (certificados Let's Encrypt)
   │   ├─ api.cliente.com  →  Supabase (login, base de datos, archivos)
   │   └─ crm.cliente.com  →  el CRM (contenedor "app")
   ├─ Supabase (db, auth, rest, storage, studio…)
   └─ app ............ el CRM (Next.js)
```

Todo vive en `supabase-prod/` (lo genera el script). El CRM **no usa ningún
dominio escrito en el código**: toma el dominio de la dirección con la que lo
visitan. Por eso el mismo código sirve para cualquier dominio sin recompilar.

> **Regla de oro:** un VPS se instala y se actualiza **solo con el script**
> (`npm run supabase-vps`). No corras `docker compose` dentro de la carpeta `crm/`
> en ese mismo servidor: crea una segunda copia del CRM y Caddy puede terminar
> mandando el tráfico a la copia equivocada (ver «Qué pasó en octubre de 2026»).

## Antes de empezar (por cada VPS)

| Necesitas | Detalle |
|---|---|
| VPS | Ubuntu 22.04 o 24.04, mínimo 2 vCPU y 4 GB de RAM (Supabase consume bastante) |
| Dos dominios | Uno para Supabase (`api.…`) y otro para el CRM (`crm.…`), distintos entre sí |
| DNS | Dos registros **A** apuntando a la IP del VPS, creados **antes** de correr el script |
| Firewall | Abiertos solo 22, 80 y 443 |
| Correo (SMTP) | Recomendado desde el inicio, ver «Correo de confirmación» |
| Meta / WhatsApp | App ID, App Secret y token del System User (ver `docs/01-meta.md`) |

## Instalación paso a paso

**1. DNS.** En tu proveedor de dominios crea los dos registros A:

```
api   →   IP-del-VPS
crm   →   IP-del-VPS
```

Comprueba que ya resuelven (desde tu computadora o desde el VPS):

```bash
dig +short api.cliente.com
dig +short crm.cliente.com
```

Si usas Cloudflare, deja los registros en **«solo DNS»** (nube gris) hasta que
termine la instalación; así Caddy puede sacar el certificado.

**2. Entra al VPS e instala lo básico (una sola vez):**

```bash
ssh root@IP-del-VPS
curl -fsSL https://get.docker.com | sh
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git
```

**3. Clona el proyecto:**

```bash
cd ~
git clone https://github.com/esanjuanlugo/crm.git
cd crm
```

**4. Credenciales.** Copia la plantilla y llénala:

```bash
cp credenciales.env.example credenciales.env
nano credenciales.env
```

Para este modo (Supabase en tu propio servidor) lo importante es el bloque de
Meta y, si quieres correos reales, el SMTP:

```
META_APP_ID=…
META_APP_SECRET=…

SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_USER=…
SMTP_PASS=…
SMTP_ADMIN_EMAIL=no-reply@cliente.com
SMTP_SENDER_NAME=Nombre del CRM
```

Sin SMTP, el script deja a los usuarios **confirmados automáticamente** (no se
envía correo). Sirve para pruebas, no para producción.

**5. Levanta todo con un comando:**

```bash
npm run supabase-vps -- --supabase api.cliente.com --crm crm.cliente.com
```

Tarda varios minutos (descarga Supabase, genera secretos, aplica las migraciones y
compila el CRM). Al final imprime las URLs y la contraseña de Supabase Studio.
**Guárdala junto con `supabase-prod/.env`**: ahí están todas las llaves.

**6. Verifica:**

```bash
npm run supabase-vps -- --verificar
```

Debe terminar en «✓ Todo en orden». Revisa que diga:

- Una sola copia del CRM
- SITE_URL de Auth correcto
- El CRM redirige al dominio correcto
- Auth de Supabase responde

**7. Prueba a mano** (en una ventana de incógnito):

1. Entra a `https://crm.cliente.com/signup` y crea un usuario.
2. Abre el correo (revisa spam) y haz clic **una sola vez** en el enlace.
3. Debes terminar en `https://crm.cliente.com/dashboard`.

**8. Conecta WhatsApp.** En Meta (Configuración de la API → Webhook) usa:

```
https://crm.cliente.com/api/whatsapp/webhook
```

Cada VPS necesita **su propia app de Meta o su propio número**: Meta entrega los
eventos a la última app que reclamó el número (ver `docs/05-gotchas.md`).

## Actualizar un VPS (cada vez que haya código nuevo)

```bash
cd ~/crm
git pull
npm run supabase-vps -- --actualizar
```

`--actualizar` aplica las migraciones nuevas, reconstruye solo el CRM y corre la
verificación. **No toca secretos ni dominios.** Si algo se ve mal, el propio
script te lo dice al final.

Atajos útiles:

```bash
npm run supabase-vps -- --migrar       # solo migraciones
npm run supabase-vps -- --verificar    # solo revisar que todo esté bien

cd ~/crm/supabase-prod
docker compose ps                      # estado de todos los servicios
docker compose logs -f app             # logs del CRM
docker compose logs -f auth            # logs del login / correos
```

## Qué es distinto en cada VPS

| Elemento | Dónde vive | ¿Se comparte entre VPS? |
|---|---|---|
| Dominios | `supabase-prod/.env` (`PROXY_DOMAIN`, `CRM_DOMAIN`) | No |
| Llaves y contraseñas de Supabase | `supabase-prod/.env` | **No, nunca las copies** |
| Llaves del CRM (`ENCRYPTION_KEY`, etc.) | `crm/.env.local` | **No**: cifran los datos de esa instalación |
| Base de datos y archivos | `supabase-prod/volumes/` | No |
| Credenciales de Meta | `credenciales.env` / `crm/.env.local` | Solo si es la misma app; el webhook apunta a un solo dominio |
| Código | Este repositorio | Sí, es el mismo en todos |

`credenciales.env`, `crm/.env.local` y `supabase-prod/.env` **no se suben a GitHub**.

## Cambiar el dominio de un VPS ya instalado

1. Crea los registros A nuevos hacia la IP del VPS.
2. Corre el comando completo con los dominios nuevos (no borra datos ni rota secretos):

```bash
cd ~/crm
npm run supabase-vps -- --supabase api.nuevo.com --crm crm.nuevo.com
npm run supabase-vps -- --verificar
```

3. Actualiza la URL del webhook en Meta.

Los enlaces de correos ya enviados con el dominio anterior dejan de servir; pide
que se envíen de nuevo.

## Correo de confirmación

- **No uses Gmail para producción.** Funciona para probar, pero los correos llegan
  a spam, tiene límite diario y requiere contraseña de aplicación.
- Usa un servicio de correo transaccional (Resend, Brevo, Amazon SES, Mailgun…) y
  configura **SPF y DKIM** del dominio del remitente.
- El enlace de confirmación **sirve una sola vez** y caduca (1 hora por defecto).
  Si el usuario lo abre dos veces, o un antivirus lo abre antes, aparece
  «Email link is invalid or has expired». Solución: reenviar el correo o confirmarlo
  a mano (abajo).

## Solución de problemas

### Qué pasó en octubre de 2026 (y cómo reconocerlo)

**Síntoma:** al confirmar el correo, el navegador terminaba en
`https://emiwheels.com/dashboard` (el dominio sin `crm.`) con
`DNS_PROBE_FINISHED_NXDOMAIN`.

**Causas (eran dos):**

1. El código tenía el dominio escrito a mano en `auth/callback/route.ts`. Ya está
   corregido: usa el dominio con el que se visita.
2. En el servidor había **dos copias del CRM** (`supabase-app-1` y `wacrm-app-1`),
   porque se corrió `docker compose` dentro de `crm/`. Caddy apuntaba a la vieja,
   así que reconstruir la nueva no cambiaba nada.

**Cómo detectarlo siempre:**

```bash
docker ps --format "{{.Names}}\t{{.Image}}" | grep -i app
```

Debe aparecer **una sola** línea de CRM (`supabase-app-1`). Si aparece otra
(`wacrm-app-1`), apágala:

```bash
cd ~/crm/crm && docker compose down
```

y confirma con `npm run supabase-vps -- --verificar`.

### El enlace de correo manda a un dominio que no existe

Corre `npm run supabase-vps -- --verificar`. Si dice que el CRM redirige a otro
dominio, es una copia vieja detrás de Caddy o una imagen sin reconstruir:

```bash
cd ~/crm/supabase-prod
docker compose up -d --build app
```

### «Email not confirmed» al iniciar sesión

El correo nunca se confirmó. Confírmalo a mano desde Supabase Studio → SQL Editor:

```sql
UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'usuario@cliente.com';
```

### Borrar un usuario de prueba para repetir el registro

Cada cuenta tiene su propio espacio de datos; hay que borrar primero la cuenta y
después el usuario (SQL Editor):

```sql
BEGIN;
DELETE FROM public.accounts WHERE owner_user_id IN (SELECT id FROM auth.users WHERE email = 'prueba@cliente.com');
DELETE FROM auth.users WHERE email = 'prueba@cliente.com';
COMMIT;
```

**Esto borra también contactos, mensajes y configuración de esa cuenta.**
Úsalo solo con usuarios de prueba.

### Caddy no saca el certificado

Casi siempre es DNS: el dominio no apunta todavía a este VPS, o está detrás de un
proxy (nube naranja de Cloudflare). Revisa `docker compose logs caddy` y reintenta
con `--verificar` cuando el dominio resuelva.

### Un cambio en `NEXT_PUBLIC_*` no se refleja

Esas variables se incorporan al **compilar**. Hace falta
`npm run supabase-vps -- --actualizar` (reconstruye la imagen), no solo reiniciar.

## Respaldos

La base vive en `supabase-prod/volumes/db/data` y los archivos en
`supabase-prod/volumes/storage`. Un respaldo mínimo de la base:

```bash
cd ~/crm/supabase-prod
set -a; . ./.env; set +a
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" supabase-db \
  pg_dump -U postgres postgres > ~/respaldo_$(date +%F).sql
```

Guarda también una copia de `supabase-prod/.env` y `crm/.env.local`: sin
`ENCRYPTION_KEY` no se pueden descifrar los datos cifrados.

## Checklist para entregar un VPS nuevo

- [ ] Los dos dominios resuelven a la IP del VPS
- [ ] `npm run supabase-vps -- --verificar` termina en «Todo en orden»
- [ ] Registro de un usuario nuevo y confirmación de correo llegan a `/dashboard`
- [ ] Correo enviado desde un SMTP propio (no Gmail), con SPF y DKIM
- [ ] Webhook de Meta apuntando a `https://crm.<dominio>/api/whatsapp/webhook`
- [ ] Firewall: solo 22, 80 y 443
- [ ] Copia segura de `supabase-prod/.env`, `crm/.env.local` y la contraseña de Studio
- [ ] Una sola copia del CRM corriendo (`docker ps`)
- [ ] Usuarios de prueba borrados
