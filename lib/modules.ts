import { and, asc, desc, eq, inArray, lt, sql } from "drizzle-orm";

import { moduleAssets, moduleComments, modules, moduleSections } from "@/db/schema";
import { ensureCommentSchema } from "@/lib/comment-schema";
import { db } from "@/lib/db";
import { hasDatabase } from "@/lib/env";
import {
  buildSearchText,
  createModuleSeedInputs,
  getCompiledSeedModuleSummaries,
  getCompiledSeedModules
} from "@/lib/content/modules";
import type { ModuleCommentView, ModuleDetailView, ModuleLevel, ModuleSummaryView } from "@/lib/types";
import { buildSectionAnchor } from "@/lib/utils";

type ListModulesOptions = {
  search?: string;
  level?: string;
  tag?: string;
};

function isDatabaseReadError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: string;
    message?: string;
  };

  return (
    candidate.code === "42P01" ||
    candidate.code === "42703" ||
    candidate.code === "42P07" ||
    candidate.message?.includes('relation "') === true ||
    candidate.message?.includes("does not exist") === true ||
    candidate.message?.includes("Failed query:") === true
  );
}

function normalizeSummary(row: {
  id: number;
  slug: string;
  title: string;
  summary: string;
  order: number;
  level: string;
  tags: string[];
  readingTime: number;
  publishedAt: Date | string;
  seoTitle: string;
  seoDescription: string;
  assetCount: number;
  commentCount: number;
  sectionCount: number;
}): ModuleSummaryView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    order: row.order,
    level: row.level as ModuleLevel,
    tags: row.tags,
    readingTime: row.readingTime,
    publishedAt: new Date(row.publishedAt).toISOString(),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    assetCount: Number(row.assetCount),
    commentCount: Number(row.commentCount),
    sectionCount: Number(row.sectionCount)
  };
}

async function listSeedModules(options: ListModulesOptions = {}) {
  const summaries = await getCompiledSeedModuleSummaries();
  const seeds = createModuleSeedInputs();
  const searchMap = new Map(seeds.map((seed) => [seed.slug, buildSearchText(seed)]));
  const search = options.search?.trim().toLowerCase();

  return summaries
    .filter((module) => {
      if (options.level && module.level !== options.level) {
        return false;
      }

      if (options.tag && !module.tags.includes(options.tag)) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = searchMap.get(module.slug) ?? "";

      return haystack.toLowerCase().includes(search);
    })
    .sort((left, right) => left.order - right.order);
}

export async function listModules(options: ListModulesOptions = {}) {
  if (!db || !hasDatabase) {
    return listSeedModules(options);
  }

  try {
    const search = options.search?.trim();
    const conditions = [];

    if (search) {
      conditions.push(
        sql`to_tsvector('simple', ${modules.searchText}) @@ websearch_to_tsquery('simple', ${search})`
      );
    }

    if (options.level) {
      conditions.push(eq(modules.level, options.level));
    }

    if (options.tag) {
      conditions.push(sql`${options.tag} = ANY(${modules.tags})`);
    }

    const query = db
      .select({
        id: modules.id,
        slug: modules.slug,
        title: modules.title,
        summary: modules.summary,
        order: modules.order,
        level: modules.level,
        tags: modules.tags,
        readingTime: modules.readingTime,
        publishedAt: modules.publishedAt,
        seoTitle: modules.seoTitle,
        seoDescription: modules.seoDescription
      })
      .from(modules);

    const baseRows = await (conditions.length ? query.where(and(...conditions)) : query).orderBy(
      asc(modules.order)
    );

    if (baseRows.length === 0) {
      return [];
    }

    const moduleIds = baseRows.map((row) => row.id);

    const [assetCounts, commentCounts, sectionCounts] = await Promise.all([
      db
        .select({
          moduleId: moduleAssets.moduleId,
          count: sql<number>`count(*)::int`
        })
        .from(moduleAssets)
        .where(inArray(moduleAssets.moduleId, moduleIds))
        .groupBy(moduleAssets.moduleId),
      db
        .select({
          moduleId: moduleComments.moduleId,
          count: sql<number>`count(*)::int`
        })
        .from(moduleComments)
        .where(
          and(
            inArray(moduleComments.moduleId, moduleIds),
            eq(moduleComments.status, "published")
          )
        )
        .groupBy(moduleComments.moduleId),
      db
        .select({
          moduleId: moduleSections.moduleId,
          count: sql<number>`count(*)::int`
        })
        .from(moduleSections)
        .where(inArray(moduleSections.moduleId, moduleIds))
        .groupBy(moduleSections.moduleId)
    ]);

    const assetCountMap = new Map(assetCounts.map((row) => [row.moduleId, Number(row.count)]));
    const commentCountMap = new Map(commentCounts.map((row) => [row.moduleId, Number(row.count)]));
    const sectionCountMap = new Map(sectionCounts.map((row) => [row.moduleId, Number(row.count)]));

    let items = baseRows.map((row) =>
      normalizeSummary({
        ...row,
        assetCount: assetCountMap.get(row.id) ?? 0,
        commentCount: commentCountMap.get(row.id) ?? 0,
        sectionCount: sectionCountMap.get(row.id) ?? 0
      })
    );

    if (search) {
      const lowered = search.toLowerCase();
      items = items.filter((item) => {
        const seed = createModuleSeedInputs().find((entry) => entry.slug === item.slug);
        const haystack = seed ? buildSearchText(seed).toLowerCase() : `${item.title} ${item.summary}`.toLowerCase();
        return haystack.includes(lowered);
      });
    }

    return items;
  } catch (error) {
    if (isDatabaseReadError(error)) {
      return listSeedModules(options);
    }

    throw error;
  }
}

export async function getCatalogFacets() {
  const allModules = await listModules();

  return {
    levels: Array.from(new Set(allModules.map((module) => module.level))),
    tags: Array.from(new Set(allModules.flatMap((module) => module.tags))).sort((a, b) =>
      a.localeCompare(b, "ru")
    )
  };
}

export async function getModuleSlugs() {
  if (!db || !hasDatabase) {
    const summaries = await getCompiledSeedModuleSummaries();
    return summaries.map((item) => item.slug);
  }

  try {
    const rows = await db.select({ slug: modules.slug }).from(modules).orderBy(asc(modules.order));
    return rows.map((row) => row.slug);
  } catch (error) {
    if (isDatabaseReadError(error)) {
      const summaries = await getCompiledSeedModuleSummaries();
      return summaries.map((item) => item.slug);
    }

    throw error;
  }
}

export async function getModuleBySlug(slug: string): Promise<ModuleDetailView | null> {
  if (!db || !hasDatabase) {
    const items = await getCompiledSeedModules();
    return items.find((item) => item.slug === slug) ?? null;
  }

  try {
    const [moduleRow] = await db
      .select({
        id: modules.id,
        slug: modules.slug,
        title: modules.title,
        summary: modules.summary,
        order: modules.order,
        level: modules.level,
        tags: modules.tags,
        readingTime: modules.readingTime,
        publishedAt: modules.publishedAt,
        seoTitle: modules.seoTitle,
        seoDescription: modules.seoDescription
      })
      .from(modules)
      .where(eq(modules.slug, slug))
      .limit(1);

    if (!moduleRow) {
      return null;
    }

    const [sectionsRows, assetsRows, commentsRows] = await Promise.all([
      db
        .select({
          kind: moduleSections.kind,
          heading: moduleSections.heading,
          sortOrder: moduleSections.sortOrder,
          markdownSource: moduleSections.markdownSource,
          htmlCached: moduleSections.htmlCached
        })
        .from(moduleSections)
        .where(eq(moduleSections.moduleId, moduleRow.id))
        .orderBy(asc(moduleSections.sortOrder)),
      db
        .select({
          id: moduleAssets.id,
          title: moduleAssets.title,
          fileType: moduleAssets.fileType,
          mimeType: moduleAssets.mimeType,
          sizeBytes: moduleAssets.sizeBytes,
          storageKey: moduleAssets.storageKey,
          checksum: moduleAssets.checksum,
          publicUrl: moduleAssets.publicUrl,
          previewJson: moduleAssets.previewJson
        })
        .from(moduleAssets)
        .where(eq(moduleAssets.moduleId, moduleRow.id))
        .orderBy(asc(moduleAssets.id)),
      db
        .select({
          count: sql<number>`count(*)::int`
        })
        .from(moduleComments)
        .where(and(eq(moduleComments.moduleId, moduleRow.id), eq(moduleComments.status, "published")))
    ]);

    return {
      ...normalizeSummary({
        ...moduleRow,
        assetCount: assetsRows.length,
        commentCount: commentsRows[0]?.count ?? 0,
        sectionCount: sectionsRows.length
      }),
      sections: sectionsRows.map((section) => ({
        kind: section.kind as ModuleDetailView["sections"][number]["kind"],
        heading: section.heading,
        sortOrder: section.sortOrder,
        markdownSource: section.markdownSource,
        htmlCached: section.htmlCached,
        anchorId: buildSectionAnchor(section.sortOrder)
      })),
      assets: assetsRows.map((asset) => ({
        id: asset.id,
        title: asset.title,
        fileType: asset.fileType as ModuleDetailView["assets"][number]["fileType"],
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        storageKey: asset.storageKey,
        checksum: asset.checksum,
        publicUrl: asset.publicUrl,
        previewJson: asset.previewJson as ModuleDetailView["assets"][number]["previewJson"]
      }))
    };
  } catch (error) {
    if (isDatabaseReadError(error)) {
      const items = await getCompiledSeedModules();
      return items.find((item) => item.slug === slug) ?? null;
    }

    throw error;
  }
}

export async function getModuleAssetsBySlug(slug: string) {
  if (!db || !hasDatabase) {
    const lesson = await getModuleBySlug(slug);
    return lesson?.assets ?? [];
  }

  try {
    const moduleId = await getModuleIdBySlug(slug);

    if (!moduleId) {
      return [];
    }

    const assetsRows = await db
      .select({
        id: moduleAssets.id,
        title: moduleAssets.title,
        fileType: moduleAssets.fileType,
        mimeType: moduleAssets.mimeType,
        sizeBytes: moduleAssets.sizeBytes,
        storageKey: moduleAssets.storageKey,
        checksum: moduleAssets.checksum,
        publicUrl: moduleAssets.publicUrl,
        previewJson: moduleAssets.previewJson
      })
      .from(moduleAssets)
      .where(eq(moduleAssets.moduleId, moduleId))
      .orderBy(asc(moduleAssets.id));

    return assetsRows.map((asset) => ({
      id: asset.id,
      title: asset.title,
      fileType: asset.fileType as ModuleDetailView["assets"][number]["fileType"],
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      storageKey: asset.storageKey,
      checksum: asset.checksum,
      publicUrl: asset.publicUrl,
      previewJson: asset.previewJson as ModuleDetailView["assets"][number]["previewJson"]
    }));
  } catch (error) {
    if (isDatabaseReadError(error)) {
      const lesson = await getModuleBySlug(slug);
      return lesson?.assets ?? [];
    }

    throw error;
  }
}

export async function getModuleIdBySlug(slug: string) {
  if (!db || !hasDatabase) {
    return null;
  }

  const [row] = await db.select({ id: modules.id }).from(modules).where(eq(modules.slug, slug)).limit(1);
  return row?.id ?? null;
}

export async function listCommentsByModuleId(moduleId: number, cursor?: number, limit = 12) {
  if (!db || !hasDatabase) {
    return { items: [] as ModuleCommentView[], nextCursor: null as number | null };
  }

  await ensureCommentSchema();

  const rows = await db
    .select({
      id: moduleComments.id,
      authorLabel: moduleComments.authorLabel,
      body: moduleComments.body,
      attachmentName: moduleComments.attachmentName,
      attachmentUrl: moduleComments.attachmentUrl,
      attachmentMimeType: moduleComments.attachmentMimeType,
      attachmentSizeBytes: moduleComments.attachmentSizeBytes,
      attachmentsJson: moduleComments.attachmentsJson,
      adminReply: moduleComments.adminReply,
      adminReplyAt: moduleComments.adminReplyAt,
      adminReplyBy: moduleComments.adminReplyBy,
      adminAttachmentName: moduleComments.adminAttachmentName,
      adminAttachmentUrl: moduleComments.adminAttachmentUrl,
      adminAttachmentMimeType: moduleComments.adminAttachmentMimeType,
      adminAttachmentSizeBytes: moduleComments.adminAttachmentSizeBytes,
      adminAttachmentsJson: moduleComments.adminAttachmentsJson,
      createdAt: moduleComments.createdAt,
      status: moduleComments.status
    })
    .from(moduleComments)
    .where(
      and(
        eq(moduleComments.moduleId, moduleId),
        eq(moduleComments.status, "published"),
        cursor ? lt(moduleComments.id, cursor) : undefined
      )
    )
    .orderBy(desc(moduleComments.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const visibleRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: visibleRows.map((row) => {
      const attachments = Array.isArray(row.attachmentsJson)
        ? row.attachmentsJson.filter(
            (item): item is ModuleCommentView["attachments"][number] =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  "name" in item &&
                  "url" in item &&
                  "mimeType" in item &&
                  "sizeBytes" in item
              )
          )
        : [];
      const adminAttachments = Array.isArray(row.adminAttachmentsJson)
        ? row.adminAttachmentsJson.filter(
            (item): item is ModuleCommentView["adminAttachments"][number] =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  "name" in item &&
                  "url" in item &&
                  "mimeType" in item &&
                  "sizeBytes" in item
              )
          )
        : [];

      return {
        id: row.id,
        authorLabel: row.authorLabel,
        body: row.body,
        attachments:
          attachments.length > 0
            ? attachments
            : row.attachmentName && row.attachmentUrl && row.attachmentMimeType && row.attachmentSizeBytes != null
              ? [
                  {
                    name: row.attachmentName,
                    url: row.attachmentUrl,
                    mimeType: row.attachmentMimeType,
                    sizeBytes: row.attachmentSizeBytes
                  }
                ]
              : [],
        adminAttachments:
          adminAttachments.length > 0
            ? adminAttachments
            : row.adminAttachmentName &&
                row.adminAttachmentUrl &&
                row.adminAttachmentMimeType &&
                row.adminAttachmentSizeBytes != null
              ? [
                  {
                    name: row.adminAttachmentName,
                    url: row.adminAttachmentUrl,
                    mimeType: row.adminAttachmentMimeType,
                    sizeBytes: row.adminAttachmentSizeBytes
                  }
                ]
              : [],
        attachmentName: row.attachmentName,
        attachmentUrl: row.attachmentUrl,
        attachmentMimeType: row.attachmentMimeType,
        attachmentSizeBytes: row.attachmentSizeBytes,
        createdAt: new Date(row.createdAt).toISOString(),
        status: row.status,
        adminReply: row.adminReply,
        adminReplyAt: row.adminReplyAt ? new Date(row.adminReplyAt).toISOString() : null,
        adminReplyBy: row.adminReplyBy,
        adminAttachmentName: row.adminAttachmentName,
        adminAttachmentUrl: row.adminAttachmentUrl,
        adminAttachmentMimeType: row.adminAttachmentMimeType,
        adminAttachmentSizeBytes: row.adminAttachmentSizeBytes
      };
    }),
    nextCursor: hasMore ? visibleRows[visibleRows.length - 1]?.id ?? null : null
  };
}
