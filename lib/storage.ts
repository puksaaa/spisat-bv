import type { ModuleFileType } from "@/lib/types";

import { env } from "@/lib/env";

const demoAssetMap: Record<ModuleFileType, string> = {
  pdf: "/demo-assets/module-handout.pdf",
  csv: "/demo-assets/practice-dataset.csv",
  txt: "/demo-assets/lesson-snippet.txt"
};

export function resolvePublicAssetUrl(storageKey: string, fileType: ModuleFileType) {
  const cdnBase = env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, "");

  if (!cdnBase) {
    return demoAssetMap[fileType];
  }

  return `${cdnBase}/${storageKey.replace(/^\//, "")}`;
}
