ALTER TABLE "module_comments"
ADD COLUMN IF NOT EXISTS "attachments_json" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "module_comments"
ADD COLUMN IF NOT EXISTS "admin_attachments_json" jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE "module_comments"
SET "attachments_json" = CASE
  WHEN "attachment_url" IS NOT NULL THEN jsonb_build_array(
    jsonb_build_object(
      'name', coalesce("attachment_name", 'file'),
      'url', "attachment_url",
      'mimeType', coalesce("attachment_mime_type", 'application/octet-stream'),
      'sizeBytes', coalesce("attachment_size_bytes", 0)
    )
  )
  ELSE '[]'::jsonb
END
WHERE coalesce(jsonb_array_length("attachments_json"), 0) = 0;

UPDATE "module_comments"
SET "admin_attachments_json" = CASE
  WHEN "admin_attachment_url" IS NOT NULL THEN jsonb_build_array(
    jsonb_build_object(
      'name', coalesce("admin_attachment_name", 'file'),
      'url', "admin_attachment_url",
      'mimeType', coalesce("admin_attachment_mime_type", 'application/octet-stream'),
      'sizeBytes', coalesce("admin_attachment_size_bytes", 0)
    )
  )
  ELSE '[]'::jsonb
END
WHERE coalesce(jsonb_array_length("admin_attachments_json"), 0) = 0;
