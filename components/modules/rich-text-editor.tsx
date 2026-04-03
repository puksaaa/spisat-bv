"use client";

import { useEffect, useRef } from "react";

import { applyItalicToSelection } from "@/lib/rich-text";

type RichTextEditorProps = {
  value: string;
  placeholder: string;
  className: string;
  onChange: (value: string) => void;
  onPaste?: (event: React.ClipboardEvent<HTMLDivElement>) => void;
};

export function RichTextEditor({ value, placeholder, className, onChange, onPaste }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current || editorRef.current.innerHTML === value) {
      return;
    }

    editorRef.current.innerHTML = value;
  }, [value]);

  function syncValue() {
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.code === "KeyI" && (event.ctrlKey || event.metaKey) && !event.altKey) {
      event.preventDefault();

      if (editorRef.current && applyItalicToSelection(editorRef.current)) {
        syncValue();
      }
    }
  }

  return (
    <div
      ref={editorRef}
      aria-label={placeholder}
      className={className}
      contentEditable
      data-placeholder={placeholder}
      role="textbox"
      suppressContentEditableWarning
      onInput={syncValue}
      onKeyDown={handleKeyDown}
      onPaste={onPaste}
    />
  );
}
