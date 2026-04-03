"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getLevelLabel } from "@/lib/utils";

type ModuleFiltersProps = {
  initialQuery: string;
  initialLevel: string;
  initialTag: string;
  levels: string[];
  tags: string[];
};

export function ModuleFilters({
  initialQuery,
  initialLevel,
  initialTag,
  levels,
  tags
}: ModuleFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [level, setLevel] = useState(initialLevel);
  const [tag, setTag] = useState(initialTag);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    } else {
      params.delete("q");
    }

    if (level) {
      params.set("level", level);
    } else {
      params.delete("level");
    }

    if (tag) {
      params.set("tag", tag);
    } else {
      params.delete("tag");
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery === currentQuery) {
      return;
    }

    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false
      });
    });
  }, [debouncedQuery, level, tag, pathname, router, searchParams]);

  return (
    <section className="catalog-filters">
      <div className="catalog-filters__field catalog-filters__field--search">
        <label htmlFor="module-search">Поиск по модулям</label>
        <input
          id="module-search"
          name="q"
          placeholder="Например: SQL, функции, Next.js"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="catalog-filters__field">
        <label htmlFor="module-level">Уровень</label>
        <select
          id="module-level"
          name="level"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
        >
          <option value="">Все</option>
          {levels.map((item) => (
            <option key={item} value={item}>
              {getLevelLabel(item as Parameters<typeof getLevelLabel>[0])}
            </option>
          ))}
        </select>
      </div>

      <div className="catalog-filters__field">
        <label htmlFor="module-tag">Тег</label>
        <select id="module-tag" name="tag" value={tag} onChange={(event) => setTag(event.target.value)}>
          <option value="">Все</option>
          {tags.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
