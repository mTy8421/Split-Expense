import { readFile } from "node:fs/promises";
import pg from "pg";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL in .env.local");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(
    await readFile(new URL("../database/schema.sql", import.meta.url), "utf8"),
  );
  console.log("Database schema ready.");
} finally {
  await pool.end();
}
