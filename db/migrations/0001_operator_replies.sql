ALTER TABLE "module_comments"
ADD COLUMN IF NOT EXISTS "admin_reply" text;

ALTER TABLE "module_comments"
ADD COLUMN IF NOT EXISTS "admin_reply_at" timestamp with time zone;

ALTER TABLE "module_comments"
ADD COLUMN IF NOT EXISTS "admin_reply_by" varchar(120);
