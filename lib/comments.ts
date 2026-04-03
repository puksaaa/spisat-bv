import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { and, desc, eq, gt } from "drizzle-orm";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";

import { moduleComments, modules } from "@/db/schema";
import { ensureCommentSchema } from "@/lib/comment-schema";
import { db } from "@/lib/db";
import { env, isProduction } from "@/lib/env";
import { getModuleIdBySlug, listCommentsByModuleId } from "@/lib/modules";
import type { CommentAttachmentView, ModuleCommentView, OperatorCommentTaskView } from "@/lib/types";

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(255),
  url: z.string().trim().min(1),
  mimeType: z.string().trim().min(1).max(160),
  sizeBytes: z.number().int().nonnegative().max(20 * 1024 * 1024)
});

const createCommentSchema = z.object({
  body: z.string().min(3).max(2000),
  turnstileToken: z.string().optional(),
  attachments: z.array(attachmentSchema).max(8).default([]),
  attachmentName: z.string().max(255).optional(),
  attachmentUrl: z.string().optional(),
  attachmentMimeType: z.string().max(160).optional(),
  attachmentSizeBytes: z.number().int().positive().max(20 * 1024 * 1024).optional()
});

const saveReplySchema = z.object({
  reply: z.string().max(4000).optional(),
  responder: z.string().trim().min(1).max(120).optional(),
  adminAttachments: z.array(attachmentSchema).max(8).default([]),
  adminAttachmentName: z.string().max(255).optional(),
  adminAttachmentUrl: z.string().optional(),
  adminAttachmentMimeType: z.string().max(160).optional(),
  adminAttachmentSizeBytes: z.number().int().positive().max(20 * 1024 * 1024).optional()
});

type ListOperatorTasksOptions = {
  afterId?: number;
};

class CommentError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const allowedAttachmentExtensions = new Set([
  "pdf",
  "txt",
  "csv",
  "md",
  "json",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "zip",
  "rar",
  "png",
  "jpg",
  "jpeg",
  "webp"
]);

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function extractClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const cloudflareIp = headers.get("cf-connecting-ip");

  return forwardedFor?.split(",")[0]?.trim() || cloudflareIp || realIp || "0.0.0.0";
}

function sanitizeComment(body: string) {
  const normalized = body
    .replace(/\r\n?/g, "\n")
    .replace(/<(div|p|section|article)[^>]*>/gi, "")
    .replace(/<\/(div|p|section|article)>/gi, "<br>")
    .replace(/\n{2,}/g, "\n")
    .replace(/\n/g, "<br>");

  return sanitizeHtml(normalized, {
    allowedTags: ["em", "i", "br"],
    allowedAttributes: {}
  })
    .replace(/<i>/gi, "<em>")
    .replace(/<\/i>/gi, "</em>")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-()\u0400-\u04FF ]+/g, "_").slice(0, 255);
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function normalizeAttachments(input: unknown): CommentAttachmentView[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => attachmentSchema.safeParse(item))
    .filter((item) => item.success)
    .map((item) => item.data);
}

function getLegacyAttachment(
  name?: string | null,
  url?: string | null,
  mimeType?: string | null,
  sizeBytes?: number | null
) {
  if (!name || !url || !mimeType || sizeBytes == null) {
    return [];
  }

  return normalizeAttachments([{ name, url, mimeType, sizeBytes }]);
}

async function saveUploadedAttachment(file: File | null, folderName: string): Promise<CommentAttachmentView | null> {
  if (!file) {
    return null;
  }

  const fileName = sanitizeFileName(file.name);
  const extension = getExtension(fileName);

  if (!allowedAttachmentExtensions.has(extension)) {
    throw new CommentError("Этот тип файла пока не поддерживается.", 400);
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new CommentError("Файл больше 20 MB не поддерживается.", 400);
  }

  const uploadsDir = path.join(process.cwd(), "public", folderName);
  const uniqueName = `${Date.now()}-${randomUUID()}.${extension}`;

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, uniqueName), Buffer.from(await file.arrayBuffer()));

  return {
    name: fileName,
    url: `/${folderName}/${uniqueName}`,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size
  };
}

async function saveUploadedAttachments(files: File[], folderName: string) {
  if (files.length > 8) {
    throw new CommentError("Можно прикрепить не больше 8 файлов за раз.", 400);
  }

  const uniqueFiles = files.filter(
    (file, index, current) =>
      current.findIndex(
        (candidate) =>
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.type === file.type &&
          candidate.lastModified === file.lastModified
      ) === index
  );

  return (
    await Promise.all(uniqueFiles.map((file) => saveUploadedAttachment(file, folderName)))
  ).filter(Boolean) as CommentAttachmentView[];
}

async function saveCommentAttachments(files: File[]) {
  return saveUploadedAttachments(files, "comment-uploads");
}

async function saveAdminReplyAttachments(files: File[]) {
  return saveUploadedAttachments(files, "comment-reply-uploads");
}

function looksLikeSpam(body: string) {
  const urls = body.match(/https?:\/\/|www\./gi)?.length ?? 0;
  const repeated = /(.)\1{11,}/.test(body);
  const lines = body.split("<br>").length;

  return urls > 1 || repeated || lines > 18;
}

async function verifyTurnstile(turnstileToken: string | undefined, ip: string) {
  if (!env.TURNSTILE_SECRET_KEY) {
    return !isProduction && turnstileToken === "development-bypass";
  }

  if (!turnstileToken) {
    return false;
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: turnstileToken,
    remoteip: ip
  });

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}

function extractFiles(formData: FormData) {
  return [...formData.getAll("attachments"), ...formData.getAll("attachment")].filter(
    (entry): entry is File => entry instanceof File && entry.size > 0
  );
}

function toInsertableAttachments(
  attachments: CommentAttachmentView[],
  legacyName?: string,
  legacyUrl?: string,
  legacyMimeType?: string,
  legacySizeBytes?: number
) {
  return attachments.length
    ? attachments
    : getLegacyAttachment(legacyName, legacyUrl, legacyMimeType, legacySizeBytes);
}

function normalizeCommentRow(row: {
  id: number;
  authorLabel: string;
  body: string;
  attachmentName: string | null;
  attachmentUrl: string | null;
  attachmentMimeType: string | null;
  attachmentSizeBytes: number | null;
  attachmentsJson: unknown;
  adminReply: string | null;
  adminReplyAt: Date | null;
  adminReplyBy: string | null;
  adminAttachmentName: string | null;
  adminAttachmentUrl: string | null;
  adminAttachmentMimeType: string | null;
  adminAttachmentSizeBytes: number | null;
  adminAttachmentsJson: unknown;
  createdAt: Date;
  status: string;
}): ModuleCommentView {
  const attachments = normalizeAttachments(row.attachmentsJson).length
    ? normalizeAttachments(row.attachmentsJson)
    : getLegacyAttachment(row.attachmentName, row.attachmentUrl, row.attachmentMimeType, row.attachmentSizeBytes);
  const adminAttachments = normalizeAttachments(row.adminAttachmentsJson).length
    ? normalizeAttachments(row.adminAttachmentsJson)
    : getLegacyAttachment(
        row.adminAttachmentName,
        row.adminAttachmentUrl,
        row.adminAttachmentMimeType,
        row.adminAttachmentSizeBytes
      );

  return {
    id: row.id,
    authorLabel: row.authorLabel,
    body: row.body,
    attachments,
    adminAttachments,
    attachmentName: row.attachmentName,
    attachmentUrl: row.attachmentUrl,
    attachmentMimeType: row.attachmentMimeType,
    attachmentSizeBytes: row.attachmentSizeBytes,
    adminReply: row.adminReply,
    adminReplyAt: row.adminReplyAt ? new Date(row.adminReplyAt).toISOString() : null,
    adminReplyBy: row.adminReplyBy,
    adminAttachmentName: row.adminAttachmentName,
    adminAttachmentUrl: row.adminAttachmentUrl,
    adminAttachmentMimeType: row.adminAttachmentMimeType,
    adminAttachmentSizeBytes: row.adminAttachmentSizeBytes,
    createdAt: new Date(row.createdAt).toISOString(),
    status: row.status
  };
}

export async function parseCommentPayloadFromRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const attachments = await saveCommentAttachments(extractFiles(formData));

    return {
      body: String(formData.get("body") ?? ""),
      turnstileToken: String(formData.get("turnstileToken") ?? ""),
      attachments
    };
  }

  return request.json();
}

export async function parseOperatorReplyPayloadFromRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const adminAttachments = await saveAdminReplyAttachments(extractFiles(formData));

    return {
      reply: String(formData.get("reply") ?? ""),
      responder: String(formData.get("responder") ?? ""),
      adminAttachments
    };
  }

  return request.json();
}

export async function getCommentsByModuleSlug(slug: string, cursor?: number) {
  if (!db) {
    throw new CommentError("Комментарии доступны только после подключения PostgreSQL.", 503);
  }

  await ensureCommentSchema();

  const moduleId = await getModuleIdBySlug(slug);

  if (!moduleId) {
    throw new CommentError("Модуль не найден.", 404);
  }

  return listCommentsByModuleId(moduleId, cursor);
}

export async function createCommentForModule(
  slug: string,
  payload: unknown,
  headers: Headers
): Promise<ModuleCommentView> {
  if (!db) {
    throw new CommentError("Комментарии доступны только после подключения PostgreSQL.", 503);
  }

  const parsed = createCommentSchema.safeParse(payload);

  if (!parsed.success) {
    throw new CommentError("Некорректное тело комментария.", 400);
  }

  await ensureCommentSchema();

  const moduleId = await getModuleIdBySlug(slug);

  if (!moduleId) {
    throw new CommentError("Модуль не найден.", 404);
  }

  const ip = extractClientIp(headers);
  const isCaptchaValid = await verifyTurnstile(parsed.data.turnstileToken, ip);

  if (!isCaptchaValid) {
    throw new CommentError("Проверка Turnstile не пройдена.", 400);
  }

  const sanitized = sanitizeComment(parsed.data.body);

  if (sanitized.length < 3) {
    throw new CommentError("Комментарий получился слишком коротким после очистки.", 400);
  }

  if (looksLikeSpam(sanitized)) {
    throw new CommentError("Комментарий похож на спам и был отклонен.", 400);
  }

  const attachments = toInsertableAttachments(
    parsed.data.attachments,
    parsed.data.attachmentName,
    parsed.data.attachmentUrl,
    parsed.data.attachmentMimeType,
    parsed.data.attachmentSizeBytes
  );
  const primaryAttachment = attachments[0];
  const ipHash = hashValue(ip);
  const userAgentHash = hashValue(headers.get("user-agent") ?? "unknown");

  const [row] = await db
    .insert(moduleComments)
    .values({
      moduleId,
      authorLabel: "Аноним",
      body: sanitized,
      attachmentName: primaryAttachment?.name,
      attachmentUrl: primaryAttachment?.url,
      attachmentMimeType: primaryAttachment?.mimeType,
      attachmentSizeBytes: primaryAttachment?.sizeBytes,
      attachmentsJson: attachments,
      status: "published",
      ipHash,
      userAgentHash
    })
    .returning({
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
    });

  return normalizeCommentRow(row);
}

export async function listOperatorTasks(
  options: ListOperatorTasksOptions = {}
): Promise<OperatorCommentTaskView[]> {
  if (!db) {
    throw new CommentError("Экран ответов доступен только после подключения PostgreSQL.", 503);
  }

  await ensureCommentSchema();

  const rows = await db
    .select({
      id: moduleComments.id,
      moduleId: moduleComments.moduleId,
      moduleSlug: modules.slug,
      moduleTitle: modules.title,
      moduleOrder: modules.order,
      body: moduleComments.body,
      createdAt: moduleComments.createdAt,
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
      adminAttachmentsJson: moduleComments.adminAttachmentsJson
    })
    .from(moduleComments)
    .innerJoin(modules, eq(modules.id, moduleComments.moduleId))
    .where(
      and(
        eq(moduleComments.status, "published"),
        options.afterId ? gt(moduleComments.id, options.afterId) : undefined
      )
    )
    .orderBy(desc(moduleComments.id));

  return rows.map((row) => {
    const attachments = normalizeAttachments(row.attachmentsJson).length
      ? normalizeAttachments(row.attachmentsJson)
      : getLegacyAttachment(row.attachmentName, row.attachmentUrl, row.attachmentMimeType, row.attachmentSizeBytes);
    const adminAttachments = normalizeAttachments(row.adminAttachmentsJson).length
      ? normalizeAttachments(row.adminAttachmentsJson)
      : getLegacyAttachment(
          row.adminAttachmentName,
          row.adminAttachmentUrl,
          row.adminAttachmentMimeType,
          row.adminAttachmentSizeBytes
        );

    return {
      id: row.id,
      moduleId: row.moduleId,
      moduleSlug: row.moduleSlug,
      moduleTitle: row.moduleTitle,
      moduleOrder: row.moduleOrder,
      body: row.body,
      createdAt: new Date(row.createdAt).toISOString(),
      attachments,
      adminAttachments,
      attachmentName: row.attachmentName,
      attachmentUrl: row.attachmentUrl,
      adminReply: row.adminReply,
      adminReplyAt: row.adminReplyAt ? new Date(row.adminReplyAt).toISOString() : null,
      adminReplyBy: row.adminReplyBy,
      adminAttachmentName: row.adminAttachmentName,
      adminAttachmentUrl: row.adminAttachmentUrl,
      adminAttachmentMimeType: row.adminAttachmentMimeType,
      adminAttachmentSizeBytes: row.adminAttachmentSizeBytes
    };
  });
}

export async function saveOperatorReply(commentId: number, payload: unknown) {
  if (!db) {
    throw new CommentError("Экран ответов доступен только после подключения PostgreSQL.", 503);
  }

  const parsed = saveReplySchema.safeParse(payload);

  if (!parsed.success) {
    throw new CommentError("Некорректное тело ответа оператора.", 400);
  }

  await ensureCommentSchema();

  const sanitizedReply = sanitizeComment(parsed.data.reply ?? "");
  const adminAttachments = toInsertableAttachments(
    parsed.data.adminAttachments,
    parsed.data.adminAttachmentName,
    parsed.data.adminAttachmentUrl,
    parsed.data.adminAttachmentMimeType,
    parsed.data.adminAttachmentSizeBytes
  );
  const primaryAdminAttachment = adminAttachments[0];

  if (sanitizedReply.length < 3 && adminAttachments.length === 0) {
    throw new CommentError("Нужен текст ответа или файл.", 400);
  }

  const [row] = await db
    .update(moduleComments)
    .set({
      adminReply: sanitizedReply || null,
      adminReplyAt: new Date(),
      adminReplyBy: parsed.data.responder?.trim() || "Оператор",
      adminAttachmentName: primaryAdminAttachment?.name,
      adminAttachmentUrl: primaryAdminAttachment?.url,
      adminAttachmentMimeType: primaryAdminAttachment?.mimeType,
      adminAttachmentSizeBytes: primaryAdminAttachment?.sizeBytes,
      adminAttachmentsJson: adminAttachments
    })
    .where(eq(moduleComments.id, commentId))
    .returning({
      id: moduleComments.id,
      adminReply: moduleComments.adminReply,
      adminReplyAt: moduleComments.adminReplyAt,
      adminReplyBy: moduleComments.adminReplyBy,
      adminAttachmentName: moduleComments.adminAttachmentName,
      adminAttachmentUrl: moduleComments.adminAttachmentUrl,
      adminAttachmentMimeType: moduleComments.adminAttachmentMimeType,
      adminAttachmentSizeBytes: moduleComments.adminAttachmentSizeBytes,
      adminAttachmentsJson: moduleComments.adminAttachmentsJson
    });

  if (!row) {
    throw new CommentError("Комментарий для ответа не найден.", 404);
  }

  return {
    id: row.id,
    adminReply: row.adminReply,
    adminReplyAt: row.adminReplyAt ? new Date(row.adminReplyAt).toISOString() : null,
    adminReplyBy: row.adminReplyBy,
    adminAttachments: normalizeAttachments(row.adminAttachmentsJson).length
      ? normalizeAttachments(row.adminAttachmentsJson)
      : getLegacyAttachment(
          row.adminAttachmentName,
          row.adminAttachmentUrl,
          row.adminAttachmentMimeType,
          row.adminAttachmentSizeBytes
        ),
    adminAttachmentName: row.adminAttachmentName,
    adminAttachmentUrl: row.adminAttachmentUrl,
    adminAttachmentMimeType: row.adminAttachmentMimeType,
    adminAttachmentSizeBytes: row.adminAttachmentSizeBytes
  };
}

export function toCommentError(error: unknown) {
  if (error instanceof CommentError) {
    return error;
  }

  return new CommentError("Внутренняя ошибка комментариев.", 500);
}
