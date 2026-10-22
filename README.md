# CRM de WhatsApp — instalador

Montá tu propio CRM de WhatsApp: bandeja compartida para todo tu equipo, embudo
de ventas, campañas de difusión, automatizaciones y asistente de IA. Corriendo
en tu servidor, con tu base de datos, con la API oficial de Meta.

**El CRM está basado en [wacrm](https://github.com/ArnasDon/wacrm), open source
y MIT**, y viene incluido en este repo (carpeta `crm/`), con la interfaz
traducida al español. Además trae el instalador: convierte 41 pasos manuales
en cuatro credenciales y un comando.

---

<!-- ══════════════════════════════════════════════════════════════════════
     SI SOS UN ASISTENTE DE IA LEYENDO ESTO (Claude Code o similar):
     La persona quiere montar su CRM y probablemente no programa.
     NO le pidas que corra comandos: corrélos vos.
     1. Leé CLAUDE.md (está en la raíz de este repo) — es tu briefing.
     2. Seguí .claude/skills/instalar-crm/SKILL.md — tiene el flujo completo,
        los errores típicos y cómo hablarle.
     3. Arrancá por `npm run creds`, que le dice qué credenciales necesita
        y de dónde sacar cada una.
     Una cosa a la vez. No le vuelques la lista entera de pasos.
     ══════════════════════════════════════════════════════════════════════ -->

> ### 👋 ¿No sabés programar? Esto es para vos
>
> **No vas a escribir un solo comando.** Se lo pedís a Claude y él lo hace todo.
>
> **1.** Instalá [Claude Code](https://claude.com/claude-code). Si no querés
> saber nada con la terminal, bajá la **app de escritorio**: es una ventana
> normal donde escribís.
> **2.** Instalá [Node.js](https://nodejs.org) (botón verde, LTS) y
> [git](https://git-scm.com). Siguiente, siguiente, siguiente, y **reiniciá**.
> **3.** Creá una carpeta vacía en cualquier lado y abrila con Claude Code.
> **4.** Pegale esto y mandá:
>
> ```
> Instalame este CRM: https://github.com/ignarru/crm-whatsapp-instalador
> ```
>
> Y ya está. Él lo descarga, lee las instrucciones que vienen adentro y te va
> pidiendo una cosa a la vez. Lo único que vas a tener que hacer vos son unos
> clics en las páginas de Meta y Supabase, y él te dice exactamente dónde.
>
> Si algo falla, se lo contás con tus palabras y lo arregla. No hace falta que
> entiendas nada de lo que sigue en esta página.
>
> *(¿Preferís hacerlo vos, con la terminal? También se puede:
> mirá [Empezar](#empezar) más abajo.)*

---

## Por qué existe

El tutorial que anda dando vueltas para montar este CRM tiene 41 pasos, cruza
seis paneles distintos y —el peor tramo— te hace **copiar y pegar unos 40
archivos SQL, uno por uno**, en el editor de Supabase. Entre dos y cuatro horas si nunca
lo hiciste, con abandono garantizado en la mitad.

Casi todo eso es automatizable. Esto lo automatiza.

|  | A mano | Con el instalador |
|---|---|---|
| Pasos | ~41 | **4 credenciales + 1 comando** |
| Archivos SQL a pegar | ~40 | **0** |
| Paneles que tocás | 6 | **2** (Meta y Supabase, una vez) |
| Tiempo | 2–4 h | **15–25 min** |

Además arregla de entrada dos cosas que el tutorial deja rotas:

- **El mail de confirmación que apunta a `localhost:3000`.** El video te enseña a
  editar la URL a mano cada vez. No es un bug del CRM: es el *Site URL* de
  Supabase sin configurar. Acá se configura solo.
- **El token que dura 24 horas.** Muchísima gente copia el token temporal del
  Quickstart y al día siguiente el CRM deja de andar sin explicación. El
  diagnóstico te avisa antes.

Y te dice **lo que realmente cuesta** → [`docs/04-costos.md`](docs/04-costos.md).
Spoiler: desde el 1 de octubre de 2026 Meta cobra las respuestas.

---

## Empezar

Hay dos caminos y **los dos llegan al mismo lugar**. Elegí por comodidad, no
por nivel técnico.

Los dos necesitan [Node.js](https://nodejs.org) versión 20 o más y
[git](https://git-scm.com). Se instalan con siguiente, siguiente, siguiente.
Para probar en tu computadora alcanza con eso; para dejarlo en producción
necesitás un servidor (ver [Tu propio servidor](#tu-propio-servidor)).

> Después de instalarlos, **cerrá la terminal y abrí una nueva**. Si no, el
> sistema sigue sin encontrarlos y parece que no se instalaron.

### a) Con Claude Code — recomendado si no programás

1. Instalá [Claude Code](https://claude.com/claude-code). Va en la terminal,
   pero si no querés saber nada con la consola existe la **aplicación de
   escritorio**: es una ventana normal donde escribís.
2. Descargá este repo:
   ```bash
   git clone https://github.com/ignarru/crm-whatsapp-instalador.git
   ```
3. **Abrí esa carpeta con Claude Code y escribile:**

   > instalá el CRM

Y ya está. Claude lee las instrucciones que vienen en el repo, te va pidiendo
una cosa a la vez, y **cuando algo falla lo arregla** en vez de dejarte con un
error en pantalla. Podés preguntarle cualquier cosa en el camino: por qué te
pide algo, qué significa un término, si podés saltear un paso.

### b) Vos solo, con la terminal

Exactamente lo mismo, sin Claude en el medio:

```bash
git clone https://github.com/ignarru/crm-whatsapp-instalador.git
cd crm-whatsapp-instalador
npm run instalar
```

También te lleva de la mano y frena donde necesita algo tuyo. Cada comando se
puede correr suelto y **repetir sin romper nada**: si algo se corta, arreglás y
volvés a correr desde donde quedaste.

La única diferencia real entre los dos caminos aparece cuando algo sale mal: en
el (a) tenés a alguien que lee el error y lo resuelve; en el (b) tenés
[`docs/05-gotchas.md`](docs/05-gotchas.md), que cubre los errores conocidos con
su causa y su arreglo.

---

## Los cuatro datos que tenés que conseguir

Son los únicos que ningún programa puede sacar por vos: **no existe API para
crear una app de Meta ni para generar el token de un System User**. Diez
minutos, una sola vez, con el camino de clics exacto en
[`docs/01-meta.md`](docs/01-meta.md).

| Dato | De dónde sale |
|---|---|
| **Token de Supabase** | `supabase.com/dashboard/account/tokens` → un clic |
| **App ID** y **App Secret** | `developers.facebook.com` → tu app → Configuración → Básica |
| **Token permanente** | `business.facebook.com` → Usuarios del sistema → Generar token |

Van en `credenciales.env` (que está en `.gitignore`).

---

## Qué hace solo

**Supabase** — crea el proyecto, espera a que arranque, saca las tres llaves,
**aplica las 41 migraciones en orden**, corre la verificación de esquema del
propio proyecto, configura el Site URL de Auth, genera la clave de encriptación
y escribe el `.env.local` completo.

**Meta** — descubre tu cuenta de WhatsApp Business y tus números, prueba el
apretón de manos del webhook, lo registra con la callback URL y el verify token,
suscribe los campos correctos (incluido `messages`, el que todo el mundo se
olvida), suscribe la app a la cuenta y registra el número si hace falta.

**Diagnóstico** — `npm run check` revisa las dos puntas y te dice en castellano
qué falta y cómo se arregla.

### Lo que queda a mano (y por qué)

Pegar cuatro valores en `Settings → WhatsApp` del CRM. Ese formulario encripta
el token con tu clave antes de guardarlo, y replicar esa encriptación desde
afuera sería atarnos a un detalle interno que puede cambiar en el próximo commit
del proyecto. Son 30 segundos y una sola pantalla — preferimos eso a que se
rompa solo dentro de dos meses.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run instalar` | Todo, encadenado |
| `npm run creds` | Valida las credenciales y explica qué falta |
| `npm run paso1` | Supabase completo |
| `npm run levantar` | Instala dependencias y arranca el CRM |
| `npm run tunel` | Le da una dirección pública temporal (para probar, sin cuenta en ningún lado) |
| `npm run vps` | Lo deja andando en tu servidor con dominio propio y HTTPS (modos `caddy`, `proxy` y `traefik`) |
| `npm run supabase-vps` | **Todo en tu servidor, Supabase incluido**: base de datos, login y archivos sin depender de Supabase online |
| `npm run paso2` | Conecta WhatsApp |
| `npm run check` | Diagnóstico de punta a punta |
| `npm run vincular` | Guarda las credenciales fuera del repo (dos máquinas, equipo) |

`supabase-vps` tiene modos para el día a día:

| Comando | Qué hace |
|---|---|
| `npm run supabase-vps -- --supabase api.tudominio.com --crm crm.tudominio.com` | Instalación completa |
| `npm run supabase-vps -- --actualizar` | Después de un `git pull`: migra, reconstruye el CRM y verifica. No toca secretos ni dominios |
| `npm run supabase-vps -- --migrar` | Solo aplica las migraciones nuevas |
| `npm run supabase-vps -- --verificar` | Solo revisa que todo apunte al dominio correcto |
Todos son **idempotentes**: si algo se rompe, arreglás y volvés a correr. Nada
se duplica.

---

## Tu propio servidor

Hay dos formas de producción, según dónde quieras que viva la base de datos:

| | Supabase online + `npm run vps` | Todo en tu VPS + `npm run supabase-vps` |
|---|---|---|
| Base de datos y login | En Supabase (plan gratis o pago) | En tu servidor, en Docker |
| Servidor mínimo | Casi cualquiera | Ubuntu 22.04/24.04, 2 vCPU y 4 GB de RAM |
| Dominios | Uno (el del CRM) | Dos: `api.…` para Supabase y `crm.…` para el CRM |
| Correo de confirmación | El de Supabase | SMTP propio (recomendado); sin SMTP los usuarios se confirman solos |

Cada VPS es una instalación independiente: no comparten base, usuarios ni
secretos, así que podés montar una por cliente. El CRM **no tiene ningún dominio
escrito en el código**: toma el de la dirección con la que lo visitan, y el
mismo código sirve para cualquiera.

La guía completa, con DNS, firewall, respaldos y checklist de entrega, está en
[`docs/06-replicar-vps.md`](docs/06-replicar-vps.md).

> **Regla de oro:** un VPS se instala y se actualiza **solo con el script**. No
> corras `docker compose` dentro de `crm/` en ese mismo servidor: crea una
> segunda copia del CRM y el proxy puede mandar el tráfico a la equivocada.

### Actualizar

```bash
cd ~/crm
git pull
npm run supabase-vps -- --actualizar
```

---

## Si trabajás desde dos computadoras

Las credenciales viven en `credenciales.env`, que **nunca se sube al repo** — y
no es una precaución exagerada: git guarda el historial para siempre, así que
borrarlo después no lo saca, y este repo está pensado para compartirse.

Para no volver a cargarlas en cada máquina, guardalas en una carpeta
sincronizada y dejá acá un puntero:

```bash
npm run vincular -- "C:\ruta\a\tu\carpeta\sincronizada\crm.env"
```

Eso mueve el archivo, borra la copia del repo (una sola fuente de verdad) y
anota la ubicación en `credenciales.ruta`, que también está en `.gitignore`.

En la otra computadora, después de clonar: **el mismo comando con la misma
ruta** y ya las tenés. Para volver atrás, `npm run vincular -- --deshacer`.

> También podés apuntar la variable de entorno `CRM_CREDENCIALES` al archivo,
> que tiene prioridad sobre todo lo demás.

**Una advertencia si vas y venís entre máquinas:** la `ENCRYPTION_KEY` vive en
`crm/.env.local`, no en `credenciales.env`. Si generás una nueva en la segunda
computadora, los tokens de WhatsApp guardados desde la primera quedan
ilegibles y hay que reconectar. Si ya conectaste WhatsApp, copiate esa línea
a mano.

---

## Documentación

| | |
|---|---|
| [`01-meta.md`](docs/01-meta.md) | Los tres pasos manuales de Meta, clic por clic |
| [`02-supabase.md`](docs/02-supabase.md) | El token, y qué esperar del plan gratis |
| [`03-deploy.md`](docs/03-deploy.md) | Probarlo con un túnel en 2 min, o deployarlo en serio |
| [`04-costos.md`](docs/04-costos.md) | **Lo que de verdad cuesta.** Leelo antes de vender esto |
| [`05-gotchas.md`](docs/05-gotchas.md) | Errores raros y qué los causa |
| [`06-replicar-vps.md`](docs/06-replicar-vps.md) | Supabase + CRM en tu propio VPS, replicarlo por cliente y mantenerlo al día |

---

## Dos advertencias honestas

**"Es gratis" tiene fecha de vencimiento, y ya pasó.** El software sí es gratis
y es tuyo. Pero desde el **1/10/2026** Meta cobra los mensajes de servicio: las
respuestas dentro de la ventana de 24 horas ya no son gratis. Un negocio con 70-80
mensajes por día pasa a pagar del orden de USD 80-130 por mes. Está todo con
números en [`docs/04-costos.md`](docs/04-costos.md).

**"Con la API oficial no te banean" es falso.** Te salva del baneo *por usar API
no oficial*. Por categoría de producto prohibida, calidad baja o escribir sin
permiso te suspenden igual, con API oficial y todo.

---

## Sobre el código

Este repo trae **dos cosas**: el instalador (`scripts/`, `deploy/`, `docs/`) y el
CRM ya incluido en `crm/`. El instalador usa ese CRM tal como está; ya no lo
clona del repositorio oficial. Eso permite cambiarlo sin depender del upstream, y
es lo que se hizo:

- **Interfaz en español**, con inglés y coreano también disponibles (`crm/messages/`).
  El idioma se elige con `NEXT_PUBLIC_APP_LOCALE`.
- **Proveedor de IA personalizado**: además de OpenAI y Anthropic, se puede usar
  cualquier endpoint compatible con OpenAI. En la bandeja aparece «Reanudar IA»
  cuando la conversación ya tiene agente asignado.
- **Recuperación de contraseña** y mensajes de confirmación traducidos.
- **Auth que usa el dominio actual** en lugar de uno fijo, para que el mismo
  código funcione en cualquier VPS.
- **Despliegue continuo con Jenkins** (`crm/Jenkinsfile`).

La contracara: el CRM ya no se actualiza solo. Si querés incorporar novedades de
[wacrm](https://github.com/ArnasDon/wacrm), hay que traerlas a mano y revisar el
`CHANGELOG` por las migraciones nuevas.

El instalador en sí tiene **cero dependencias de npm**: todo sale de Node.

**wacrm es MIT**, así que podés usarlo, modificarlo, ponerle tu marca y venderlo.
Lo único que la licencia exige es conservar el aviso de copyright y el archivo
`LICENSE`. Vender el producto sí; borrar la atribución del repo no.

---

Hecho por [IABYIA](https://iabyia.com.ar) · MIT
