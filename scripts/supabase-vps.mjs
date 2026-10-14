#!/usr/bin/env node
/**
 * npm run supabase-vps — CRM + Supabase self-hosted (todo en Docker) en TU
 * servidor, con HTTPS. Reemplaza a Supabase online: la base de datos, el login
 * y los archivos viven en tu VPS.
 *
 * Se corre DENTRO del servidor (Linux, Ubuntu/Debian recomendado), con root o sudo.
 *
 * Qué hace:
 *   1. Baja el stack OFICIAL de Supabase self-hosted (setup.sh) y genera todos
 *      los secretos y llaves. No se versiona acá: se baja la última versión.
 *   2. Lo configura con tus dominios y le agrega el CRM + Caddy (HTTPS).
 *   3. Cierra los puertos de Postgres al exterior (el stack oficial los abre).
 *   4. Aplica las migraciones de crm/supabase/migrations.
 *   5. Escribe crm/.env.local y levanta el CRM.
 *
 * Uso:
 *   npm run supabase-vps -- --supabase api.tudominio.com --crm crm.tudominio.com
 *   npm run supabase-vps -- --migrar      (solo aplica migraciones nuevas)
 *
 * Los dos dominios tienen que apuntar (registro A) a la IP de este servidor
 * ANTES de correrlo, o Caddy no puede sacar el certificado.
 *
 * Opcional en credenciales.env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 * SMTP_ADMIN_EMAIL, SMTP_SENDER_NAME (mails de confirmación/invitaciones).
 * Sin SMTP, los usuarios se confirman solos (sin verificar el mail).
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { promises as dns } from "node:dns";
import {
  ROOT, CRM_DIR, C, ok, warn, info, encabezado, titulo, morir, leerEnv, escribirEnv,
  preguntar, confirmar, hexAlAzar, rutaCredenciales, verificarNode,
} from "./lib/ui.mjs";

verificarNode();

const argv = process.argv.slice(2);
const valorDe = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const soloMigrar = argv.includes("--migrar");

const PROYECTO = resolve(ROOT, "supabase-prod");
const ENV_SB = resolve(PROYECTO, ".env");
const ENV_CRM = resolve(CRM_DIR, ".env.local");
const DIR_MIG = resolve(CRM_DIR, "supabase", "migrations");
const creds = leerEnv(rutaCredenciales());

encabezado("CRM + Supabase self-hosted", "Docker en tu servidor");

if (process.platform !== "linux") {
  morir("Esto se corre DENTRO del servidor (Linux).", "Entrá por SSH a tu VPS, cloná este repo ahí y corré el comando.");
}
if (!existsSync(DIR_MIG)) morir("No encuentro crm/supabase/migrations.", "Verificá que ./crm tenga el código completo.");

// ── 0. dominios ─────────────────────────────────────────────────────────────
let dSb = limpiar(valorDe("--supabase") || creds.SUPABASE_DOMAIN || "");
let dCrm = limpiar(valorDe("--crm") || creds.CRM_DOMAIN || (creds.PUBLIC_URL || ""));
if (soloMigrar && existsSync(ENV_SB)) {
  const e = leerEnv(ENV_SB);
  dSb ||= e.PROXY_DOMAIN || ""; dCrm ||= e.CRM_DOMAIN || "";
}
if (!soloMigrar) {
  titulo("0. Dominios");
  if (!dSb) dSb = limpiar(await preguntar("  Dominio para Supabase (ej. api.tudominio.com)"));
  if (!dCrm) dCrm = limpiar(await preguntar("  Dominio para el CRM     (ej. crm.tudominio.com)"));
  if (!dSb || !dCrm || dSb === dCrm) morir("Necesito dos dominios distintos.", "Ej: --supabase api.tudominio.com --crm crm.tudominio.com");
  for (const d of [dSb, dCrm]) {
    try { const ips = await dns.resolve4(d); ok(`${d} → ${ips.join(", ")}`, "verificá que sea la IP de este servidor"); }
    catch { warn(`${d} no resuelve todavía`, "creá el registro A hacia la IP de este servidor; sin eso no hay HTTPS"); }
  }
  if (!(await confirmar("  ¿Seguir?", true))) process.exit(0);
}

// ── 1. stack oficial ────────────────────────────────────────────────────────
if (!soloMigrar) {
  titulo("1. Stack oficial de Supabase self-hosted");
  if (existsSync(ENV_SB)) {
    ok("supabase-prod/ ya existe", "no lo toco (así no se rotan tus secretos)");
  } else {
    const tmp = resolve(ROOT, ".setup-supabase.sh");
    sh("curl", ["-fsSL", "-o", tmp, "https://raw.githubusercontent.com/supabase/supabase/master/docker/setup.sh"]);
    info("Instalando Docker si falta, bajando el stack y generando secretos (varios minutos)…");
    sh("sh", [tmp, "-y", "--project-dir", "supabase-prod"], ROOT);
    ok("Stack descargado", "secretos y llaves generados");
  }
  if (!existsSync(ENV_SB)) morir("No se creó supabase-prod/.env.", "Revisá el error de arriba.");

  // ── 2. configuración ──────────────────────────────────────────────────────
  titulo("2. Configuración");
  const smtp = creds.SMTP_HOST
    ? {
        SMTP_HOST: creds.SMTP_HOST, SMTP_PORT: creds.SMTP_PORT || "587",
        SMTP_USER: creds.SMTP_USER || "", SMTP_PASS: creds.SMTP_PASS || "",
        SMTP_ADMIN_EMAIL: creds.SMTP_ADMIN_EMAIL || creds.SMTP_USER || `admin@${dCrm}`,
        SMTP_SENDER_NAME: creds.SMTP_SENDER_NAME || "CRM",
        ENABLE_EMAIL_AUTOCONFIRM: "false",
      }
    : { ENABLE_EMAIL_AUTOCONFIRM: "true" };

  setEnv(ENV_SB, {
    SUPABASE_PUBLIC_URL: `https://${dSb}`,
    API_EXTERNAL_URL: `https://${dSb}/auth/v1`,
    SITE_URL: `https://${dCrm}`,
    ADDITIONAL_REDIRECT_URLS: `https://${dCrm}`,
    PROXY_DOMAIN: dSb,
    CRM_DOMAIN: dCrm,
    CERTBOT_EMAIL: `admin@${dCrm.split(".").slice(-2).join(".")}`,
    ...smtp,
  });
  ok("URLs, dominios y Auth configurados");
  if (!creds.SMTP_HOST) {
    warn("Sin SMTP: los usuarios se confirman solos (sin verificar el mail)",
      "para mails reales, agregá SMTP_HOST/PORT/USER/PASS a credenciales.env y corré de nuevo");
  }

  const e = leerEnv(ENV_SB);
  setEnv(ENV_SB, {
    NEXT_PUBLIC_SUPABASE_URL: `https://${dSb}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: e.ANON_KEY,
    NEXT_PUBLIC_SITE_URL: `https://${dCrm}`,
    NEXT_PUBLIC_APP_LOCALE: leerEnv(ENV_CRM).NEXT_PUBLIC_APP_LOCALE || "es",
    COMPOSE_FILE: "docker-compose.yml:docker-compose.caddy.yml:docker-compose.crm.yml",
  });

  mkdirSync(resolve(PROYECTO, "crm-proxy"), { recursive: true });
  copyFileSync(resolve(ROOT, "deploy", "supabase", "Caddyfile"), resolve(PROYECTO, "crm-proxy", "Caddyfile"));
  writeFileSync(resolve(PROYECTO, "docker-compose.crm.yml"), composeCrm());
  ok("Caddy (HTTPS) + CRM agregados al stack", "Postgres NO queda expuesto a internet");

  // ── 3. .env.local del CRM ─────────────────────────────────────────────────
  titulo("3. crm/.env.local");
  const previo = leerEnv(ENV_CRM);
  escribirEnv(ENV_CRM, [
    { titulo: "SUPABASE (self-hosted)", vars: {
      NEXT_PUBLIC_SUPABASE_URL: `https://${dSb}`,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: e.ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: e.SERVICE_ROLE_KEY,
    }},
    { titulo: "SECRETOS DE LA APP", vars: {
      ENCRYPTION_KEY: previo.ENCRYPTION_KEY || hexAlAzar(32),
      AUTOMATION_CRON_SECRET: previo.AUTOMATION_CRON_SECRET || hexAlAzar(32),
    }},
    { titulo: "META", vars: {
      META_APP_SECRET: creds.META_APP_SECRET || previo.META_APP_SECRET || "",
      META_APP_ID: creds.META_APP_ID || previo.META_APP_ID || "",
    }},
    { titulo: "SITIO", vars: {
      NEXT_PUBLIC_SITE_URL: `https://${dCrm}`,
      NEXT_PUBLIC_APP_LOCALE: previo.NEXT_PUBLIC_APP_LOCALE || "es",
    }},
  ], "Generado por `npm run supabase-vps`. NO subir a GitHub.");
  ok("crm/.env.local escrito", "ENCRYPTION_KEY conservada si ya existía");

  // ── 4. Supabase arriba (sin app todavía) ──────────────────────────────────
  titulo("4. Levantando Supabase");
  const servicios = compose("config", "--services").split("\n").map((s) => s.trim())
    .filter((s) => s && !["app", "caddy"].includes(s));
  compose("up", "-d", "--wait", "--wait-timeout", "600", ...servicios);
  ok("Servicios de Supabase sanos", servicios.join(", "));
}

// ── 5. migraciones ──────────────────────────────────────────────────────────
titulo(`${soloMigrar ? "1" : "5"}. Migraciones`);
migrar();

// ── 6. app + HTTPS ──────────────────────────────────────────────────────────
if (!soloMigrar) {
  titulo("6. CRM + HTTPS");
  info("Construyendo la imagen del CRM (varios minutos la primera vez)…");
  compose("up", "-d", "--build", "--wait", "--wait-timeout", "600", "app", "caddy");
  ok("CRM y Caddy arriba");

  const e = leerEnv(ENV_SB);
  console.log(`\n${C.green(C.bold("✓ Listo."))}`);
  console.log(`  CRM               ${C.bold(`https://${dCrm}`)}`);
  console.log(`  Supabase Studio   ${C.bold(`https://${dSb}`)}   ${C.dim(`usuario: ${e.DASHBOARD_USERNAME}  contraseña: ${e.DASHBOARD_PASSWORD}`)}`);
  console.log(`  Webhook de Meta   ${C.bold(`https://${dCrm}/api/whatsapp/webhook`)}`);
  console.log(C.dim(`\n  Guardá supabase-prod/.env en un lugar seguro: tiene TODAS las llaves.`));
  console.log(C.dim(`  Backup: la base vive en supabase-prod/volumes/db/data y los archivos en volumes/storage.`));
  console.log(C.dim(`  Firewall: dejá abiertos solo 22, 80 y 443.`));
  console.log(C.dim(`  Logs:  cd supabase-prod && docker compose logs -f app\n`));
}

// ── helpers ─────────────────────────────────────────────────────────────────
function migrar() {
  const e = leerEnv(ENV_SB);
  const psql = (sql, entrada) =>
    execFileSync("docker", ["exec", "-i", "-e", `PGPASSWORD=${e.POSTGRES_PASSWORD}`, "supabase-db",
      "psql", "-h", "localhost", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-qtA",
      ...(sql ? ["-c", sql] : ["--single-transaction", "-f", "-"])],
      { input: entrada, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });

  psql(`create schema if not exists supabase_migrations;
        create table if not exists supabase_migrations.schema_migrations
          (version text primary key, name text, statements text[]);`);
  const hechas = new Set(psql("select version from supabase_migrations.schema_migrations").split("\n").filter(Boolean));
  const archivos = readdirSync(DIR_MIG).filter((f) => f.endsWith(".sql")).sort();
  let nuevas = 0;
  for (const f of archivos) {
    const version = f.split("_")[0];
    if (hechas.has(version)) continue;
    info(`aplicando ${f}`);
    const sql = readFileSync(resolve(DIR_MIG, f), "utf8");
    try {
      psql(null, `${sql}\n;insert into supabase_migrations.schema_migrations(version, name) values ('${version}', '${f.replace(/'/g, "''")}');`);
    } catch {
      morir(`Falló la migración ${f}.`, "Pegale el error de arriba a Claude Code. Las anteriores quedaron aplicadas; al corregirlo, volvé a correr con --migrar.");
    }
    nuevas++;
  }
  psql("notify pgrst, 'reload schema'");
  ok(nuevas ? `${nuevas} migración(es) aplicada(s)` : "Base al día", `${archivos.length} en total`);
}

function composeCrm() {
  return `# Generado por scripts/supabase-vps.mjs — agrega el CRM al stack de Supabase,
# apunta Caddy al Caddyfile con los dos dominios y cierra Postgres al exterior.
services:
  app:
    build:
      context: ${CRM_DIR}
      args:
        NEXT_PUBLIC_SUPABASE_URL: \${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: \${NEXT_PUBLIC_SUPABASE_ANON_KEY}
        NEXT_PUBLIC_SITE_URL: \${NEXT_PUBLIC_SITE_URL}
        NEXT_PUBLIC_APP_LOCALE: \${NEXT_PUBLIC_APP_LOCALE:-es}
    env_file:
      - ${resolve(CRM_DIR, ".env.local")}
    environment:
      PORT: 3000
    expose:
      - "3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000').then((r)=>process.exit(r.ok||r.status<500?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s

  # El stack oficial publica Postgres (5432) y el pooler (6543) en el host.
  # En producción eso es una puerta abierta a internet: se cierra.
  supavisor:
    ports: !reset []

  caddy:
    environment:
      CRM_DOMAIN: \${CRM_DOMAIN}
    volumes:
      # Mismo destino que el del overlay oficial: este reemplaza al suyo.
      - ./crm-proxy:/etc/caddy
    depends_on:
      app:
        condition: service_started
`;
}

function compose(...a) {
  return execFileSync("docker", ["compose", ...a], { cwd: PROYECTO, encoding: "utf8", stdio: ["ignore", a[0] === "config" ? "pipe" : "inherit", "inherit"] }) || "";
}

function sh(cmd, a, cwd = ROOT) {
  try { execFileSync(cmd, a, { cwd, stdio: "inherit" }); }
  catch { morir(`Falló: ${cmd} ${a.join(" ")}`, "Revisá el error de arriba (¿root o sudo? ¿hay internet?)."); }
}

function setEnv(path, vars) {
  let txt = readFileSync(path, "utf8");
  for (const [k, v] of Object.entries(vars)) {
    const linea = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, "m");
    txt = re.test(txt) ? txt.replace(re, () => linea) : `${txt.replace(/\n*$/, "\n")}${linea}\n`;
  }
  writeFileSync(path, txt);
}

function limpiar(d) {
  return String(d || "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}