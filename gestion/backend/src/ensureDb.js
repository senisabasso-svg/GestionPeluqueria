/**
 * SQLite local: prisma/gestionBdPeluqueria.db. En cada arranque ejecuta `prisma db push`
 * para alinear tablas/columnas con schema.prisma (evita BD antigua sin salon_categorias, etc.).
 * Carga backend/.env antes. Si DATABASE_URL no es file:, no hace push aquí.
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

const SQLITE_FILE = "gestionBdPeluqueria.db";
const defaultSqliteUrl = `file:./${SQLITE_FILE}`;

function useSqlite() {
  const u = process.env.DATABASE_URL;
  return !u || u.startsWith("file:");
}

function sqliteDbPath() {
  return join(prismaDir, SQLITE_FILE);
}

export function ensureLocalSqlite() {
  if (!useSqlite()) return;
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = defaultSqliteUrl;
  }
  const dbPath = sqliteDbPath();
  const existed = existsSync(dbPath);
  if (!existed) {
    console.log("[DB] Creando base local", SQLITE_FILE, "(prisma db push)…");
  } else {
    console.log("[DB] Sincronizando esquema con schema.prisma (prisma db push)…");
  }
  try {
    execSync("npx prisma db push --skip-generate", {
      cwd: backendRoot,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || defaultSqliteUrl },
      shell: true,
    });
  } catch (e) {
    console.error("[DB] Falló prisma db push. En backend/: npm install && npx prisma generate");
    throw e;
  }
}

ensureLocalSqlite();
