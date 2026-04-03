"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

import { RichTextEditor } from "@/components/modules/rich-text-editor";
import type { CommentAttachmentView, ModuleCommentView } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type CommentsPanelProps = {
  slug: string;
  compact?: boolean;
};

type CommentsResponse = {
  items: ModuleCommentView[];
  nextCursor: number | null;
};

const waitingMessage = "Подождите... решаем проблему";

function getPlainTextLength(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim().length;
}

function mergeFiles(current: File[], incoming: File[]) {
  const merged = [...current];

  for (const file of incoming) {
    const exists = merged.some(
      (candidate) =>
        candidate.name === file.name &&
        candidate.size === file.size &&
        candidate.type === file.type &&
        candidate.lastModified === file.lastModified
    );

    if (!exists) {
      merged.push(file);
    }
  }

  return merged.slice(0, 8);
}

function AttachmentList({
  items,
  className,
  downloadLabel = false
}: {
  items: CommentAttachmentView[];
  className: string;
  downloadLabel?: boolean;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {items.map((item) => (
        <a key={`${item.url}-${item.name}`} download={item.name} href={item.url} rel="noreferrer" target="_blank">
          {downloadLabel ? `Скачать ${item.name}` : item.name}
        </a>
      ))}
    </div>
  );
}

export function CommentsPanel({ slug, compact = false }: CommentsPanelProps) {
  const [comments, setComments] = useState<ModuleCommentView[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [pendingCommentId, setPendingCommentId] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const plainBodyLength = useMemo(() => getPlainTextLength(body), [body]);
  const visibleComments = compact
    ? comments.filter((comment) => comment.adminReply || comment.adminAttachments.length > 0)
    : comments;

  const loadComments = useCallback(
    async (cursor?: number, silent = false) => {
      const isLoadMore = Boolean(cursor);

      setError("");

      if (!silent) {
        isLoadMore ? setLoadingMore(true) : setLoading(true);
      }

      try {
        const response = await fetch(
          cursor ? `/api/modules/${slug}/comments?cursor=${cursor}` : `/api/modules/${slug}/comments`,
          {
            method: "GET",
            cache: "no-store"
          }
        );

        const data = (await response.json()) as CommentsResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Не удалось загрузить комментарии.");
        }

        startTransition(() => {
          setComments((current) => (cursor ? [...current, ...data.items] : data.items));
          setNextCursor(data.nextCursor);
        });
      } catch (loadError) {
        if (!silent) {
          setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить комментарии.");
        }
      } finally {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [slug]
  );

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!compact) {
      return;
    }

    const intervalMs = waitingForAnswer ? 1500 : 4000;
    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        void loadComments(undefined, true);
      }
    }, intervalMs);

    function handleVisibilityChange() {
      if (!document.hidden) {
        void loadComments(undefined, true);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [compact, loadComments, waitingForAnswer]);

  useEffect(() => {
    if (!pendingCommentId) {
      return;
    }

    const repliedComment = comments.find(
      (comment) => comment.id === pendingCommentId && Boolean(comment.adminReply || comment.adminAttachments.length > 0)
    );

    if (repliedComment) {
      setWaitingForAnswer(false);
      setPendingCommentId(null);
    }
  }, [comments, pendingCommentId]);

  function handleFiles(nextFiles: File[]) {
    setAttachments((current) => mergeFiles(current, nextFiles));
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((item): item is File => Boolean(item));

    if (files.length === 0) {
      return;
    }

    event.preventDefault();
    handleFiles(files);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setWaitingForAnswer(false);
    setPendingCommentId(null);
    setError("");
    setSubmitMessage("");

    try {
      const formData = new FormData();
      formData.set("body", body);
      formData.set("turnstileToken", siteKey ? turnstileToken : "development-bypass");

      for (const file of attachments) {
        formData.append("attachments", file);
      }

      const response = await fetch(`/api/modules/${slug}/comments`, {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as { item?: ModuleCommentView; error?: string };

      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "Не удалось отправить комментарий.");
      }

      startTransition(() => {
        setComments((current) => [data.item as ModuleCommentView, ...current]);
      });

      setBody("");
      setAttachments([]);
      setTurnstileToken("");

      if (compact) {
        setPendingCommentId(data.item.id);
        setWaitingForAnswer(true);
        void loadComments(undefined, true);
      } else {
        setSubmitMessage("Комментарий опубликован.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить комментарий.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={compact ? "comments-panel comments-panel--compact" : "detail-section comments-panel"}>
      {!compact ? (
        <div className="detail-section__header">
          <div>
            <span className="eyebrow">Обсуждение</span>
            <h2>Комментарии к модулю</h2>
          </div>
          <p>Публикация без регистрации, с несколькими файлами и вставкой скриншотов из буфера.</p>
        </div>
      ) : null}

      <form className={compact ? "comment-form comment-form--compact" : "comment-form"} onSubmit={handleSubmit}>
        {!compact ? <label>Ваш комментарий</label> : null}
        <RichTextEditor
          className={compact ? "comment-form__editor" : "comment-form__editor comment-form__editor--full"}
          placeholder={compact ? "Опишите проблему." : "Опишите проблему."}
          value={body}
          onChange={setBody}
          onPaste={handlePaste}
        />

        {siteKey ? (
          <div className={compact ? "comment-form__footer comment-form__footer--compact" : "comment-form__footer"}>
            <Turnstile
              options={{
                theme: "light",
                size: "flexible"
              }}
              siteKey={siteKey}
              onSuccess={(token) => setTurnstileToken(token)}
            />
          </div>
        ) : null}

        <div className={compact ? "comment-form__attachment comment-form__attachment--compact" : "comment-form__attachment"}>
          <label className="comment-form__file">
            <input
              accept=".pdf,.txt,.csv,.md,.json,.doc,.docx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg,.webp"
              multiple
              type="file"
              onChange={(event) => handleFiles(Array.from(event.target.files ?? []))}
            />
            <span>Файлы</span>
          </label>
          <span className="comment-form__paste-note">Ctrl+V вставит скриншот из буфера</span>
        </div>

        {attachments.length > 0 ? (
          <div className="comment-form__files">
            {attachments.map((file, index) => (
              <div key={`${file.name}-${file.lastModified}-${index}`} className="comment-form__file-chip">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <button
          aria-label={submitting ? "Отправляем комментарий" : "Отправить комментарий"}
          className={compact ? "comment-form__submit comment-form__submit--compact" : "comment-form__submit"}
          disabled={submitting || plainBodyLength < 3 || (Boolean(siteKey) && !turnstileToken)}
          type="submit"
        >
          {compact ? (submitting ? "..." : "→") : submitting ? "Отправляем..." : "Опубликовать"}
        </button>
      </form>

      {submitMessage ? <div className="status-banner status-banner--success">{submitMessage}</div> : null}
      {error ? <div className="status-banner status-banner--error">{error}</div> : null}

      {loading ? (
        <div className={compact ? "comments-loader comments-loader--compact" : "comments-loader"}>
          <span className="comments-loader__spinner" />
          <span>{waitingMessage}</span>
        </div>
      ) : null}

      {!loading && submitting ? (
        <div className={compact ? "comments-loader comments-loader--compact" : "comments-loader"}>
          <span className="comments-loader__spinner" />
          <span>{waitingMessage}</span>
        </div>
      ) : null}

      {!loading && !submitting && waitingForAnswer ? (
        <div className={compact ? "comments-loader comments-loader--compact" : "comments-loader"}>
          <span className="comments-loader__spinner" />
          <span>{waitingMessage}</span>
        </div>
      ) : null}

      {!loading && !compact && comments.length === 0 && !error ? (
        <div className="comments-panel__empty">Пока комментариев нет. Первый отзыв может задать тон обсуждению.</div>
      ) : null}

      <div className="comments-list">
        {visibleComments.map((comment) => (
          <article key={comment.id} className="comment-card">
            {!compact ? (
              <div className="comment-card__top">
                <strong>{comment.authorLabel}</strong>
                <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
              </div>
            ) : null}

            {!compact ? <div className="comment-card__body" dangerouslySetInnerHTML={{ __html: comment.body }} /> : null}

            {!compact ? <AttachmentList className="comment-card__attachments" items={comment.attachments} /> : null}

            {compact ? (
              <div className="comment-card__reply comment-card__reply--standalone">
                <span className="comment-card__reply-marker" />
                <div className="comment-card__reply-content comment-card__reply-content--stack">
                  {comment.adminReply ? (
                    <div className="comment-card__reply-body" dangerouslySetInnerHTML={{ __html: comment.adminReply }} />
                  ) : null}
                  <AttachmentList className="comment-card__reply-downloads" items={comment.adminAttachments} />
                </div>
              </div>
            ) : comment.adminReply || comment.adminAttachments.length > 0 ? (
              <div className="comment-card__reply">
                <span className="comment-card__reply-marker" />
                <div className="comment-card__reply-content comment-card__reply-content--stack">
                  {comment.adminReply ? (
                    <div className="comment-card__reply-body" dangerouslySetInnerHTML={{ __html: comment.adminReply }} />
                  ) : null}
                  <AttachmentList
                    className="comment-card__reply-downloads comment-card__reply-downloads--inline"
                    downloadLabel
                    items={comment.adminAttachments}
                  />
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {nextCursor ? (
        <button className="comments-panel__more" disabled={loadingMore} type="button" onClick={() => loadComments(nextCursor)}>
          {compact ? (loadingMore ? "..." : "Еще") : loadingMore ? "Загружаем..." : "Показать еще"}
        </button>
      ) : null}
    </section>
  );
}
