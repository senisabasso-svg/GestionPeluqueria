/**
 * Carga backend/.env y, al arrancar backend, ejecuta `prisma db push`
 * para crear/actualizar tablas según schema.prisma.
 * Esto permite iniciar sobre una PostgreSQL vacía sin errores de tablas faltantes.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const backendRoot = join(__dirname, "..");
export const prismaDir = join(backendRoot, "prisma");

function loadEnvFile() {
  const p = join(backendRoot, ".env");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

export function ensureDbSchema() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("[DB] Falta DATABASE_URL. Defínala para conectar y crear/sincronizar tablas.");
  }
  console.log("[DB] Verificando y sincronizando tablas con prisma db push…");
  try {
    execSync("npx prisma db push --skip-generate", {
      cwd: backendRoot,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: databaseUrl },
      shell: true,
    });
  } catch (e) {
    console.error("[DB] Falló prisma db push. Revise DATABASE_URL y ejecute: npx prisma generate");
    throw e;
  }
}

ensureDbSchema();
