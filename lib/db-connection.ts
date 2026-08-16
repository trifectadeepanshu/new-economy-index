import { neon } from "@neondatabase/serverless";

function requireUrl(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Database connection is not configured (${names.join(" or ")})`);
}

export function getReadSql() {
  return neon(requireUrl("DATABASE_READ_URL", "DATABASE_URL"));
}

export function getWriteSql() {
  return neon(requireUrl("DATABASE_WRITE_URL", "DATABASE_URL"));
}

export function getMigrationSql() {
  return neon(requireUrl("DATABASE_MIGRATION_URL", "DATABASE_WRITE_URL", "DATABASE_URL"));
}
