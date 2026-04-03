"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const LazyCommentsPanel = dynamic(
  () => import("@/components/modules/comments-panel").then((module) => module.CommentsPanel),
  {
    ssr: false,
    loading: () => <div className="comments-secret__loading">Загружаем обсуждение...</div>
  }
);

type SecretCommentsTriggerProps = {
  slug: string;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) || target.isContentEditable;
}

export function SecretCommentsTrigger({ slug }: SecretCommentsTriggerProps) {
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      setIsSpacePressed(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, [isOpen]);

  function handleOpen() {
    if (isOpen || !isSpacePressed) {
      return;
    }

    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  return (
    <section className={`comments-secret ${isOpen ? "comments-secret--open" : ""}`}>
      <button
        aria-expanded={isOpen}
        aria-label="Открыть скрытый блок комментариев"
        className="comments-secret__trigger"
        title="Space + click"
        type="button"
        onClick={handleOpen}
      >
        <span className="sr-only">Открыть комментарии</span>
      </button>

      {isOpen ? (
        <div ref={panelRef} className="comments-secret__panel">
          <div className="comments-secret__panel-head">
            <button
              aria-label="Закрыть комментарии"
              className="comments-secret__close"
              type="button"
              onClick={handleClose}
            >
              ×
            </button>
          </div>
          <LazyCommentsPanel compact slug={slug} />
        </div>
      ) : null}
    </section>
  );
}
