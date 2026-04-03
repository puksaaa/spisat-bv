import { getModuleAssetsBySlug } from "@/lib/modules";
import { formatBytes } from "@/lib/utils";

type ModuleAssetsSectionProps = {
  slug: string;
};

export async function ModuleAssetsSection({ slug }: ModuleAssetsSectionProps) {
  const assets = await getModuleAssetsBySlug(slug);

  return (
    <section className="detail-section">
      <div className="detail-section__header">
        <div>
          <span className="eyebrow">Вложения</span>
          <h2>Файлы к уроку</h2>
        </div>
        <p>Короткие карточки остаются на странице, а сами файлы открываются отдельно по публичной ссылке.</p>
      </div>

      <div className="asset-grid">
        {assets.map((asset) => (
          <article key={`${asset.storageKey}-${asset.fileType}`} className="asset-card">
            <div className="asset-card__top">
              <span className={`asset-card__type asset-card__type--${asset.fileType}`}>{asset.fileType}</span>
              <span>{formatBytes(asset.sizeBytes)}</span>
            </div>

            <h3>{asset.title}</h3>
            <p>{asset.previewJson.excerpt}</p>

            <div className="asset-card__note">{asset.previewJson.formatNote}</div>

            <a href={asset.publicUrl} rel="noreferrer" target="_blank">
              {asset.previewJson.ctaLabel}
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
