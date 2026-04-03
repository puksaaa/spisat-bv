import Link from "next/link";

import type { ModuleSummaryView } from "@/lib/types";
import { formatDate, getLevelLabel } from "@/lib/utils";

type ModuleCardProps = {
  module: ModuleSummaryView;
};

export function ModuleCard({ module }: ModuleCardProps) {
  return (
    <Link className="module-card" href={`/modules/${module.slug}`}>
      <div className="module-card__lead">
        <span className="module-card__index">{String(module.order).padStart(2, "0")}</span>

        <div className="module-card__body">
          <div className="module-card__top">
            <div className="module-card__title">
              <h3>{module.title}</h3>
              <p>{module.summary}</p>
            </div>
            <span className={`module-card__level module-card__level--${module.level}`}>
              {getLevelLabel(module.level)}
            </span>
          </div>

          <div className="module-card__footer">
            <div className="module-card__meta">
              <span>{module.readingTime} мин</span>
              <span>{module.assetCount} файла</span>
              <span>{formatDate(module.publishedAt)}</span>
            </div>

            <div className="module-card__tags">
              {module.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
