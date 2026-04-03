"use client";

import { useEffect, useRef, useState } from "react";

import { RichTextEditor } from "@/components/modules/rich-text-editor";
import type { CommentAttachmentView, OperatorCommentTaskView } from "@/lib/types";

type OperatorInboxResponse = {
  items?: OperatorCommentTaskView[];
  error?: string;
};

type OperatorReplyResponse = {
  item?: {
    id: number;
    adminReply: string | null;
    adminReplyAt: string | null;
    adminReplyBy: string | null;
    adminAttachments: CommentAttachmentView[];
    adminAttachmentName: string | null;
    adminAttachmentUrl: string | null;
    adminAttachmentMimeType: string | null;
    adminAttachmentSizeBytes: number | null;
  };
  error?: string;
};

const POLL_INTERVAL_MS = 2000;

function AttachmentButtons({ items, emptyLabel = "Скачать файл" }: { items: CommentAttachmentView[]; emptyLabel?: string }) {
  if (items.length === 0) {
    return (
      <span aria-disabled className="operator-card__file operator-card__file--disabled">
        {emptyLabel}
      </span>
    );
  }

  return (
    <div className="operator-card__files">
      {items.map((item) => (
        <a key={`${item.url}-${item.name}`} className="operator-card__file" download={item.name} href={item.url}>
          {item.name}
        </a>
      ))}
    </div>
  );
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

export function OperatorInbox() {
  const [items, setItems] = useState<OperatorCommentTaskView[]>([]);
  const [replyById, setReplyById] = useState<Record<number, string>>({});
  const [replyAttachmentsById, setReplyAttachmentsById] = useState<Record<number, File[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const itemsRef = useRef<OperatorCommentTaskView[]>([]);
  const pollingRef = useRef(false);
  const latestIdRef = useRef(0);

  function updateItems(nextItems: OperatorCommentTaskView[]) {
    itemsRef.current = nextItems;
    latestIdRef.current = nextItems.reduce((maxId, item) => Math.max(maxId, item.id), 0);
    setItems(nextItems);
  }

  function hydrateReplyDrafts(incomingItems: OperatorCommentTaskView[], replace = false) {
    setReplyById((current) => {
      const next = replace ? {} : { ...current };

      for (const item of incomingItems) {
        if (next[item.id] === undefined) {
          next[item.id] = item.adminReply ?? "";
        }
      }

      return next;
    });
  }

  function prependNewItems(incomingItems: OperatorCommentTaskView[]) {
    if (incomingItems.length === 0) {
      return;
    }

    const existingIds = new Set(itemsRef.current.map((item) => item.id));
    const freshItems = incomingItems.filter((item) => !existingIds.has(item.id));

    if (freshItems.length === 0) {
      return;
    }

    updateItems([...freshItems, ...itemsRef.current].sort((left, right) => right.id - left.id));
    hydrateReplyDrafts(freshItems);
  }

  async function fetchInbox(afterId?: number) {
    const search = afterId ? `?afterId=${afterId}` : "";
    const response = await fetch(`/api/operator/comments${search}`, {
      cache: "no-store"
    });
    const data = (await response.json()) as OperatorInboxResponse;

    if (!response.ok || !data.items) {
      throw new Error(data.error ?? "Не удалось загрузить входящие комментарии.");
    }

    return data.items;
  }

  useEffect(() => {
    async function loadInitialItems() {
      setLoading(true);
      setError("");

      try {
        const loadedItems = await fetchInbox();
        updateItems(loadedItems);
        hydrateReplyDrafts(loadedItems, true);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Не удалось загрузить входящие комментарии.");
      } finally {
        setLoading(false);
      }
    }

    void loadInitialItems();
  }, []);

  useEffect(() => {
    async function pollForNewItems() {
      if (document.hidden || pollingRef.current) {
        return;
      }

      pollingRef.current = true;

      try {
        const latestId = latestIdRef.current;
        const incomingItems = await fetchInbox(latestId);

        if (!latestId) {
          updateItems(incomingItems);
          hydrateReplyDrafts(incomingItems, true);
          return;
        }

        prependNewItems(incomingItems);
      } catch (pollError) {
        setError(pollError instanceof Error ? pollError.message : "Не удалось обновить входящие комментарии.");
      } finally {
        pollingRef.current = false;
      }
    }

    const intervalId = window.setInterval(() => {
      void pollForNewItems();
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (!document.hidden) {
        void pollForNewItems();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  async function handleSave(id: number) {
    const reply = replyById[id]?.trim() ?? "";
    const attachments = replyAttachmentsById[id] ?? [];

    if (reply.length < 3 && attachments.length === 0) {
      return;
    }

    setSavingId(id);
    setError("");

    try {
      const formData = new FormData();
      formData.set("reply", replyById[id] ?? "");
      formData.set("responder", "Оператор");

      for (const file of attachments) {
        formData.append("attachments", file);
      }

      const response = await fetch(`/api/operator/comments/${id}`, {
        method: "PATCH",
        body: formData
      });

      const data = (await response.json()) as OperatorReplyResponse;

      if (!response.ok || !data.item) {
        throw new Error(data.error ?? "Не удалось сохранить ответ.");
      }

      updateItems(
        itemsRef.current.map((item) =>
          item.id === id
            ? {
                ...item,
                adminReply: data.item?.adminReply ?? null,
                adminReplyAt: data.item?.adminReplyAt ?? null,
                adminReplyBy: data.item?.adminReplyBy ?? null,
                adminAttachments: data.item?.adminAttachments ?? [],
                adminAttachmentName: data.item?.adminAttachmentName ?? null,
                adminAttachmentUrl: data.item?.adminAttachmentUrl ?? null,
                adminAttachmentMimeType: data.item?.adminAttachmentMimeType ?? null,
                adminAttachmentSizeBytes: data.item?.adminAttachmentSizeBytes ?? null
              }
            : item
        )
      );
      setReplyAttachmentsById((current) => ({
        ...current,
        [id]: []
      }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не удалось сохранить ответ.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="operator-state">Загружаем входящие комментарии...</div>;
  }

  return (
    <section className="operator-inbox">
      {error ? <div className="operator-state operator-state--error">{error}</div> : null}

      {items.map((item) => (
        <article key={item.id} className="operator-card">
          <div className="operator-card__top">
            <strong>Модуль {item.moduleOrder}</strong>
            <AttachmentButtons items={item.attachments} />
          </div>

          <div className="operator-card__question" dangerouslySetInnerHTML={{ __html: item.body }} />

          <div className="operator-card__answer-row">
            <span>Ваш ответ</span>
            <div className="operator-card__answer">
              <div className="operator-card__answer-tools">
                <label className="operator-card__attach" aria-label="Прикрепить файлы к ответу">
                  <input
                    accept=".pdf,.txt,.csv,.md,.json,.doc,.docx,.xls,.xlsx,.zip,.rar,.png,.jpg,.jpeg,.webp"
                    multiple
                    type="file"
                    onChange={(event) =>
                      setReplyAttachmentsById((current) => ({
                        ...current,
                        [item.id]: mergeFiles(current[item.id] ?? [], Array.from(event.target.files ?? []))
                      }))
                    }
                  />
                  <span>+</span>
                </label>
                <div className="operator-card__attach-list">
                  {(replyAttachmentsById[item.id]?.length
                    ? replyAttachmentsById[item.id].map((file) => file.name)
                    : item.adminAttachments.map((file) => file.name)
                  ).map((name) => (
                    <span key={name} className="operator-card__attach-name">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
              <RichTextEditor
                className="operator-card__editor"
                placeholder="Ответ..."
                value={replyById[item.id] ?? ""}
                onChange={(value) =>
                  setReplyById((current) => ({
                    ...current,
                    [item.id]: value
                  }))
                }
              />
              <button
                disabled={
                  savingId === item.id ||
                  (
                    (replyById[item.id]?.replace(/<[^>]+>/g, "").trim().length ?? 0) < 3 &&
                    (replyAttachmentsById[item.id]?.length ?? 0) === 0
                  )
                }
                type="button"
                onClick={() => handleSave(item.id)}
              >
                {savingId === item.id ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
