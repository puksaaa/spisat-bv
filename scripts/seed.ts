import { eq } from "drizzle-orm";

import { moduleAssets, modules, moduleSections } from "../db/schema";
import { db } from "../lib/db";
import { buildSearchText, createModuleSeedInputs } from "../lib/content/modules";
import { compileMarkdown } from "../lib/markdown";

async function main() {
  if (!db) {
    throw new Error("DATABASE_URL is required to seed PostgreSQL.");
  }

  const seeds = createModuleSeedInputs();

  for (const seed of seeds) {
    const [moduleRow] = await db
      .insert(modules)
      .values({
        slug: seed.slug,
        title: seed.title,
        summary: seed.summary,
        order: seed.order,
        level: seed.level,
        tags: seed.tags,
        readingTime: seed.readingTime,
        publishedAt: new Date(seed.publishedAt),
        seoTitle: seed.seoTitle,
        seoDescription: seed.seoDescription,
        searchText: buildSearchText(seed)
      })
      .onConflictDoUpdate({
        target: modules.slug,
        set: {
          title: seed.title,
          summary: seed.summary,
          order: seed.order,
          level: seed.level,
          tags: seed.tags,
          readingTime: seed.readingTime,
          publishedAt: new Date(seed.publishedAt),
          seoTitle: seed.seoTitle,
          seoDescription: seed.seoDescription,
          searchText: buildSearchText(seed),
          updatedAt: new Date()
        }
      })
      .returning({ id: modules.id });

    await db.delete(moduleSections).where(eq(moduleSections.moduleId, moduleRow.id));
    await db.delete(moduleAssets).where(eq(moduleAssets.moduleId, moduleRow.id));

    const compiledSections = await Promise.all(
      seed.sections.map(async (section) => ({
        moduleId: moduleRow.id,
        kind: section.kind,
        heading: section.heading,
        sortOrder: section.sortOrder,
        markdownSource: section.markdownSource,
        htmlCached: await compileMarkdown(section.markdownSource)
      }))
    );

    await db.insert(moduleSections).values(compiledSections);
    await db.insert(moduleAssets).values(
      seed.assets.map((asset) => ({
        moduleId: moduleRow.id,
        title: asset.title,
        fileType: asset.fileType,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        storageKey: asset.storageKey,
        checksum: asset.checksum,
        publicUrl: asset.publicUrl,
        previewJson: asset.previewJson
      }))
    );
  }

  console.log(`Seeded ${seeds.length} modules.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
