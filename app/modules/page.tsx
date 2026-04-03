import Link from "next/link";
import type { Metadata } from "next";

import { ModuleCard } from "@/components/modules/module-card";
import { ModuleFilters } from "@/components/modules/module-filters";
import { getCatalogFacets, listModules } from "@/lib/modules";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Каталог модулей | Обучение от тети Аннушки",
  description: "Все 40 учебных модулей по программированию с фильтрами, тегами и поиском по содержимому.",
  alternates: {
    canonical: absoluteUrl("/modules")
  }
};

export const revalidate = 3600;

type ModulesPageProps = {
  searchParams: Promise<{
    q?: string;
    level?: string;
    tag?: string;
  }>;
};

export default async function ModulesPage({ searchParams }: ModulesPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const level = params.level?.trim() ?? "";
  const tag = params.tag?.trim() ?? "";

  const [modules, facets] = await Promise.all([
    listModules({
      search: query || undefined,
      level: level || undefined,
      tag: tag || undefined
    }),
    getCatalogFacets()
  ]);

  return (
    <main className="shell page">
      <section className="catalog-hero">
        <span className="eyebrow">Каталог</span>
        <h1>Все модули по программированию</h1>
        <p>Фильтруйте библиотеку по теме, уровню и тегам. Все материалы открыты без регистрации.</p>
      </section>

      <ModuleFilters
        initialLevel={level}
        initialQuery={query}
        initialTag={tag}
        levels={facets.levels}
        tags={facets.tags}
      />

      <section className="section section--tight">
        <div className="section__heading">
          <div>
            <span className="eyebrow">Результаты</span>
            <h2>{modules.length ? `Найдено модулей: ${modules.length}` : "По этому запросу ничего не найдено"}</h2>
          </div>
          {(query || level || tag) && (
            <Link className="section__link" href="/modules">
              Сбросить фильтры
            </Link>
          )}
        </div>

        {modules.length ? (
          <div className="module-grid">
            {modules.map((module) => (
              <ModuleCard key={module.slug} module={module} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            Попробуйте убрать часть фильтров или сократить поисковый запрос.
          </div>
        )}
      </section>
    </main>
  );
}
