import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ModuleAssetsSection } from "@/components/modules/module-assets-section";
import { ModuleContent } from "@/components/modules/module-content";
import { ModuleToc } from "@/components/modules/module-toc";
import { SecretCommentsTrigger } from "@/components/modules/secret-comments-trigger";
import { getModuleBySlug, getModuleSlugs } from "@/lib/modules";
import { absoluteUrl, formatDate, getLevelLabel } from "@/lib/utils";

export const revalidate = 3600;

type ModulePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = await getModuleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getModuleBySlug(slug);

  if (!lesson) {
    return {
      title: "Модуль не найден | Обучение от тети Аннушки"
    };
  }

  return {
    title: lesson.seoTitle,
    description: lesson.seoDescription,
    alternates: {
      canonical: absoluteUrl(`/modules/${lesson.slug}`)
    },
    openGraph: {
      title: lesson.seoTitle,
      description: lesson.seoDescription,
      url: absoluteUrl(`/modules/${lesson.slug}`),
      images: [absoluteUrl("/opengraph-image")]
    },
    twitter: {
      card: "summary_large_image",
      title: lesson.seoTitle,
      description: lesson.seoDescription,
      images: [absoluteUrl("/opengraph-image")]
    }
  };
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { slug } = await params;
  const lesson = await getModuleBySlug(slug);

  if (!lesson) {
    notFound();
  }

  return (
    <main className="shell page">
      <div className="detail-backlink">
        <Link href="/modules">← К каталогу модулей</Link>
      </div>

      <section className="module-hero">
        <div className="module-hero__content">
          <span className="module-hero__eyebrow">Модуль {String(lesson.order).padStart(2, "0")}</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.summary}</p>

          <div className="module-hero__meta">
            <span>{getLevelLabel(lesson.level)}</span>
            <span>{lesson.readingTime} мин чтения</span>
            <span>{lesson.assetCount} файла</span>
            <span>{formatDate(lesson.publishedAt)}</span>
          </div>

          <div className="module-hero__tags">
            {lesson.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="module-layout">
        <div className="module-layout__main">
          <ModuleContent sections={lesson.sections} />

          <Suspense fallback={<div className="detail-section">Загружаем файловые карточки...</div>}>
            <ModuleAssetsSection slug={lesson.slug} />
          </Suspense>
        </div>

        <div className="module-layout__aside">
          <ModuleToc
            items={lesson.sections.map((section) => ({
              anchorId: section.anchorId,
              heading: section.heading
            }))}
          />
        </div>
      </section>

      <SecretCommentsTrigger slug={lesson.slug} />
    </main>
  );
}
