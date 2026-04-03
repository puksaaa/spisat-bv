import clsx from "clsx";

import type { ModuleLevel } from "@/lib/types";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(dateIso));
}

export function getLevelLabel(level: ModuleLevel) {
  switch (level) {
    case "base":
      return "База";
    case "core":
      return "Практика";
    case "advanced":
      return "Продвинуто";
    default:
      return level;
  }
}

export function absoluteUrl(path = "/") {
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildSectionAnchor(sortOrder: number) {
  return `section-${sortOrder}`;
}
