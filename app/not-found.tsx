import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell page">
      <section className="loading-state">
        <span className="eyebrow">404</span>
        <h1>Такого модуля нет</h1>
        <p>Проверьте slug страницы или вернитесь в каталог модулей.</p>
        <Link className="inline-link" href="/modules">
          Открыть каталог
        </Link>
      </section>
    </main>
  );
}
