"use client";

import { useEffect, useRef } from "react";

import type { ModuleDetailView } from "@/lib/types";

type ModuleContentProps = {
  sections: ModuleDetailView["sections"];
};

export function ModuleContent({ sections }: ModuleContentProps) {
  const articleRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const article = articleRef.current;

    if (!article) {
      return;
    }

    const preElements = Array.from(article.querySelectorAll("pre"));
    const cleanups = preElements.map((pre, index) => {
      const element = pre as HTMLElement;

      if (element.dataset.enhanced === "true") {
        return () => undefined;
      }

      element.dataset.enhanced = "true";

      const wrapper = document.createElement("div");
      wrapper.className = "code-frame";

      const button = document.createElement("button");
      button.className = "code-frame__copy";
      button.type = "button";
      button.textContent = "Скопировать";
      button.setAttribute("aria-label", `Скопировать пример ${index + 1}`);

      const copyHandler = async () => {
        try {
          await navigator.clipboard.writeText(pre.textContent ?? "");
          button.textContent = "Скопировано";
          window.setTimeout(() => {
            button.textContent = "Скопировать";
          }, 1800);
        } catch {
          button.textContent = "Ошибка";
        }
      };

      button.addEventListener("click", copyHandler);

      const parent = pre.parentNode;
      parent?.insertBefore(wrapper, pre);
      wrapper.append(button, pre);

      return () => {
        button.removeEventListener("click", copyHandler);
        if (wrapper.parentNode) {
          wrapper.parentNode.insertBefore(pre, wrapper);
          wrapper.remove();
        }
        delete element.dataset.enhanced;
      };
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [sections]);

  return (
    <article ref={articleRef} className="module-article">
      {sections.map((section) => (
        <section key={section.anchorId} className="module-article__section" id={section.anchorId}>
          <header className="module-article__header">
            <span>{section.kind}</span>
            <h2>{section.heading}</h2>
          </header>

          <div dangerouslySetInnerHTML={{ __html: section.htmlCached }} />
        </section>
      ))}
    </article>
  );
}
