ALTER TABLE "module_comments"
ADD COLUMN IF NOT EXISTS "admin_attachment_name" varchar(255);

ALTER TABLE "module_comments"
ADD COLUMN IF NOT EXISTS "admin_attachment_url" text;

ALTER TABLE "module_comments"
ADD COLUMN IF NOT EXISTS "admin_attachment_mime_type" varchar(160);

ALTER TABLE "module_comments"
ADD COLUMN IF NOT EXISTS "admin_attachment_size_bytes" integer;
