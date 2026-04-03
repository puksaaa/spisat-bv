type ModuleTocProps = {
  items: Array<{
    anchorId: string;
    heading: string;
  }>;
};

export function ModuleToc({ items }: ModuleTocProps) {
  return (
    <aside className="module-toc">
      <p>Содержание</p>

      <nav>
        {items.map((item) => (
          <a key={item.anchorId} href={`#${item.anchorId}`}>
            {item.heading}
          </a>
        ))}
      </nav>
    </aside>
  );
}
