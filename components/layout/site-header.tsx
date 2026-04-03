import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="brand" href="/">
          <span className="brand__mark" />
          <span>
            <strong>Обучение от тети Аннушки</strong>
            <small>Открытые уроки по программированию</small>
          </span>
        </Link>

        <nav className="site-nav">
          <Link href="/modules">Каталог</Link>
          <Link href="/">Главная</Link>
          <Link href="/#formats">Форматы</Link>
          <Link href="/operator">Ответы</Link>
        </nav>
      </div>
    </header>
  );
}
