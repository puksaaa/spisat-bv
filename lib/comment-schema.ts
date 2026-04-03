import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

let ensureCommentSchemaPromise: Promise<void> | null = null;

const commentSchemaStatements = [
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "admin_reply" text;`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "admin_reply_at" timestamp with time zone;`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "admin_reply_by" varchar(120);`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "admin_attachment_name" varchar(255);`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "admin_attachment_url" text;`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "admin_attachment_mime_type" varchar(160);`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "admin_attachment_size_bytes" integer;`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "attachment_name" varchar(255);`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "attachment_url" text;`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "attachment_mime_type" varchar(160);`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "attachment_size_bytes" integer;`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "attachments_json" jsonb NOT NULL DEFAULT '[]'::jsonb;`,
  `ALTER TABLE "module_comments" ADD COLUMN IF NOT EXISTS "admin_attachments_json" jsonb NOT NULL DEFAULT '[]'::jsonb;`
];

export async function ensureCommentSchema() {
  if (!db) {
    return;
  }

  if (!ensureCommentSchemaPromise) {
    ensureCommentSchemaPromise = (async () => {
      for (const statement of commentSchemaStatements) {
        await db.execute(sql.raw(statement));
      }
    })().catch((error) => {
      ensureCommentSchemaPromise = null;
      throw error;
    });
  }

  await ensureCommentSchemaPromise;
}
