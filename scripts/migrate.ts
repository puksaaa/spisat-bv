import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

import { env } from "../lib/env";

async function main() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  const sqlClient = postgres(env.DATABASE_URL, {
    max: 1,
    prepare: false
  });

  try {
    const migrationsDir = path.join(process.cwd(), "db", "migrations");
    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSql = await readFile(migrationPath, "utf8");

      await sqlClient.unsafe(migrationSql);
      console.log(`Applied migration: ${file}`);
    }
  } finally {
    await sqlClient.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
