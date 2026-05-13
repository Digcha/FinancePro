import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

function databasePath() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!url.startsWith("file:")) {
    throw new Error("scripts/db-push.ts supports SQLite file: DATABASE_URL values in local development.");
  }

  const value = url.slice("file:".length);
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), "prisma", value);
}

const dbPath = databasePath();
const reset = process.argv.includes("--reset");
mkdirSync(path.dirname(dbPath), { recursive: true });

if (reset && existsSync(dbPath)) {
  rmSync(dbPath);
}

const prismaBin = path.resolve(process.cwd(), "node_modules", ".bin", "prisma");
try {
  execFileSync(prismaBin, ["db", "push", "--skip-generate"], {
    stdio: "inherit",
    env: process.env
  });
} catch {
  console.warn("Prisma db push could not migrate the existing local SQLite schema. Recreating local dev database.");
  execFileSync(prismaBin, ["db", "push", "--skip-generate", "--force-reset"], {
    stdio: "inherit",
    env: process.env
  });
}

console.log(`SQLite schema ready at ${dbPath}`);
