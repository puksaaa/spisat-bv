import type { MetadataRoute } from "next";

import { getModuleSlugs } from "@/lib/modules";
import { absoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getModuleSlugs();

  return [
    {
      url: absoluteUrl("/"),
      priority: 1,
      changeFrequency: "weekly"
    },
    {
      url: absoluteUrl("/modules"),
      priority: 0.9,
      changeFrequency: "daily"
    },
    ...slugs.map((slug) => ({
      url: absoluteUrl(`/modules/${slug}`),
      priority: 0.8,
      changeFrequency: "weekly" as const
    }))
  ];
}
