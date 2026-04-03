CREATE TABLE IF NOT EXISTS "modules" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" varchar(160) NOT NULL,
    "title" varchar(200) NOT NULL,
    "summary" text NOT NULL,
    "sort_order" integer NOT NULL,
    "level" varchar(32) NOT NULL,
    "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "reading_time" integer NOT NULL,
    "published_at" timestamp with time zone NOT NULL,
    "seo_title" varchar(200) NOT NULL,
    "seo_description" text NOT NULL,
    "search_text" text DEFAULT '' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "module_sections" (
    "id" serial PRIMARY KEY NOT NULL,
    "module_id" integer NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
    "kind" varchar(32) NOT NULL,
    "heading" varchar(200) NOT NULL,
    "sort_order" integer NOT NULL,
    "markdown_source" text NOT NULL,
    "html_cached" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "module_assets" (
    "id" serial PRIMARY KEY NOT NULL,
    "module_id" integer NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
    "title" varchar(200) NOT NULL,
    "file_type" varchar(24) NOT NULL,
    "mime_type" varchar(120) NOT NULL,
    "size_bytes" integer NOT NULL,
    "storage_key" text NOT NULL,
    "checksum" varchar(128) NOT NULL,
    "public_url" text NOT NULL,
    "preview_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "module_comments" (
    "id" serial PRIMARY KEY NOT NULL,
    "module_id" integer NOT NULL REFERENCES "modules"("id") ON DELETE CASCADE,
    "author_label" varchar(80) DEFAULT 'Аноним' NOT NULL,
    "body" text NOT NULL,
    "status" varchar(24) DEFAULT 'published' NOT NULL,
    "ip_hash" varchar(128) NOT NULL,
    "user_agent_hash" varchar(128) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "modules_slug_idx" ON "modules" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "modules_sort_order_idx" ON "modules" ("sort_order");
CREATE INDEX IF NOT EXISTS "modules_level_idx" ON "modules" ("level");
CREATE UNIQUE INDEX IF NOT EXISTS "module_sections_order_idx" ON "module_sections" ("module_id", "sort_order");
CREATE INDEX IF NOT EXISTS "module_assets_module_id_idx" ON "module_assets" ("module_id");
CREATE INDEX IF NOT EXISTS "module_comments_module_id_idx" ON "module_comments" ("module_id");
CREATE INDEX IF NOT EXISTS "module_comments_created_at_idx" ON "module_comments" ("created_at");
CREATE INDEX IF NOT EXISTS "module_comments_status_idx" ON "module_comments" ("status");
CREATE INDEX IF NOT EXISTS "modules_search_text_idx" ON "modules" USING GIN (to_tsvector('simple', "search_text"));
