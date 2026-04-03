import Link from "next/link";

import { ModuleCard } from "@/components/modules/module-card";
import { listModules } from "@/lib/modules";

export const revalidate = 3600;

export default async function HomePage() {
  const modules = await listModules();
  const featured = modules.slice(0, 5);
  const compactCatalog = modules.slice(0, 6);

  return (
    <main className="shell page page--home">
      <section className="hero">
        <span className="hero__eyebrow">Открытая библиотека</span>
        <h1>Обучение от тети Аннушки</h1>
        <p className="hero__summary">
          Короткие модули по программированию в очень спокойном формате. Одна страница урока, одна
          структура, никакой лишней перегрузки.
        </p>

        <form action="/modules" className="hero__search">
          <input name="q" placeholder="Найти модуль: SQL, React, циклы..." type="search" />
          <button type="submit">Найти</button>
        </form>

        <div className="hero__facts">
          <span>40 модулей</span>
          <span>Без регистрации</span>
          <span>PDF / CSV / TXT</span>
          <span>Публичные уроки</span>
        </div>

        <div className="hero__actions">
          <Link href="/modules">Открыть каталог</Link>
          <a href="#formats">Форматы файлов</a>
        </div>
      </section>

      <section className="section">
        <div className="section__heading">
          <div>
            <span className="eyebrow">Старт</span>
            <h2>С чего удобно начать</h2>
          </div>
          <p>Несколько первых модулей, чтобы быстро увидеть темп и подачу материалов.</p>
        </div>

        <div className="module-grid">
          {featured.map((module) => (
            <ModuleCard key={module.slug} module={module} />
          ))}
        </div>
      </section>

      <section className="section" id="formats">
        <div className="section__heading">
          <div>
            <span className="eyebrow">Файлы</span>
            <h2>Поддерживаются обычные учебные форматы</h2>
          </div>
          <p>Текст урока не смешивается с тяжелыми вложениями. Файлы открываются отдельно.</p>
        </div>

        <div className="format-grid">
          <article className="format-card">
            <span>PDF</span>
            <strong>Конспекты и раздатки</strong>
            <p>Подходят для повторения, печати и скачивания без входа в систему.</p>
          </article>
          <article className="format-card">
            <span>CSV</span>
            <strong>Данные для практики</strong>
            <p>Наборы можно открывать отдельно, не перегружая страницу самого модуля.</p>
          </article>
          <article className="format-card">
            <span>TXT</span>
            <strong>Шпаргалки и заметки</strong>
            <p>Легкие текстовые файлы для коротких подсказок и примеров команд.</p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="section__heading">
          <div>
            <span className="eyebrow">Каталог</span>
            <h2>Несколько модулей из общей библиотеки</h2>
          </div>
          <Link className="section__link" href="/modules">
            Открыть полный каталог
          </Link>
        </div>

        <div className="module-grid">
          {compactCatalog.map((module) => (
            <ModuleCard key={module.slug} module={module} />
          ))}
        </div>
      </section>
    </main>
  );
}
