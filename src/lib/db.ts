import { Pool } from "pg";
const globalDb = globalThis as unknown as { harnkanPool?: Pool };
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("Database not configured");
  if (!globalDb.harnkanPool)
    globalDb.harnkanPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
  return globalDb.harnkanPool;
}
