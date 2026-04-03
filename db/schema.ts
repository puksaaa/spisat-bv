import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";

export const modules = pgTable(
  "modules",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    summary: text("summary").notNull(),
    order: integer("sort_order").notNull(),
    level: varchar("level", { length: 32 }).notNull(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    readingTime: integer("reading_time").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    seoTitle: varchar("seo_title", { length: 200 }).notNull(),
    seoDescription: text("seo_description").notNull(),
    searchText: text("search_text").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("modules_slug_idx").on(table.slug),
    uniqueIndex("modules_sort_order_idx").on(table.order),
    index("modules_level_idx").on(table.level)
  ]
);

export const moduleSections = pgTable(
  "module_sections",
  {
    id: serial("id").primaryKey(),
    moduleId: integer("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    heading: varchar("heading", { length: 200 }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    markdownSource: text("markdown_source").notNull(),
    htmlCached: text("html_cached").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex("module_sections_order_idx").on(table.moduleId, table.sortOrder)]
);

export const moduleAssets = pgTable(
  "module_assets",
  {
    id: serial("id").primaryKey(),
    moduleId: integer("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    fileType: varchar("file_type", { length: 24 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull(),
    checksum: varchar("checksum", { length: 128 }).notNull(),
    publicUrl: text("public_url").notNull(),
    previewJson: jsonb("preview_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("module_assets_module_id_idx").on(table.moduleId)]
);

export const moduleComments = pgTable(
  "module_comments",
  {
    id: serial("id").primaryKey(),
    moduleId: integer("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    authorLabel: varchar("author_label", { length: 80 }).notNull().default("РђРЅРѕРЅРёРј"),
    body: text("body").notNull(),
    attachmentName: varchar("attachment_name", { length: 255 }),
    attachmentUrl: text("attachment_url"),
    attachmentMimeType: varchar("attachment_mime_type", { length: 160 }),
    attachmentSizeBytes: integer("attachment_size_bytes"),
    attachmentsJson: jsonb("attachments_json").notNull().default(sql`'[]'::jsonb`),
    adminReply: text("admin_reply"),
    adminReplyAt: timestamp("admin_reply_at", { withTimezone: true }),
    adminReplyBy: varchar("admin_reply_by", { length: 120 }),
    adminAttachmentName: varchar("admin_attachment_name", { length: 255 }),
    adminAttachmentUrl: text("admin_attachment_url"),
    adminAttachmentMimeType: varchar("admin_attachment_mime_type", { length: 160 }),
    adminAttachmentSizeBytes: integer("admin_attachment_size_bytes"),
    adminAttachmentsJson: jsonb("admin_attachments_json").notNull().default(sql`'[]'::jsonb`),
    status: varchar("status", { length: 24 }).notNull().default("published"),
    ipHash: varchar("ip_hash", { length: 128 }).notNull(),
    userAgentHash: varchar("user_agent_hash", { length: 128 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("module_comments_module_id_idx").on(table.moduleId),
    index("module_comments_created_at_idx").on(table.createdAt),
    index("module_comments_status_idx").on(table.status)
  ]
);
