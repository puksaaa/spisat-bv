import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";
import { env } from "@/lib/env";

const globalForDatabase = globalThis as typeof globalThis & {
  __methodicsSql?: ReturnType<typeof postgres>;
  __methodicsDb?: ReturnType<typeof drizzle>;
};

function createDatabase() {
  if (!env.DATABASE_URL) {
    return null;
  }

  if (!globalForDatabase.__methodicsSql) {
    globalForDatabase.__methodicsSql = postgres(env.DATABASE_URL, {
      max: 10,
      prepare: false
    });
  }

  if (!globalForDatabase.__methodicsDb) {
    globalForDatabase.__methodicsDb = drizzle(globalForDatabase.__methodicsSql, {
      schema
    });
  }

  return globalForDatabase.__methodicsDb;
}

export const db = createDatabase();
