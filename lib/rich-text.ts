function getSelectionRoot(root: HTMLElement, range: Range) {
  const commonAncestor = range.commonAncestorContainer;
  return commonAncestor instanceof Element ? commonAncestor : commonAncestor.parentElement;
}

export function hasSelectionWithin(root: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const selectionRoot = getSelectionRoot(root, range);

  return Boolean(selectionRoot && root.contains(selectionRoot));
}

function emitInput(root: HTMLElement) {
  root.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "formatItalic" }));
}

function applyItalicFallback(root: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const selectionRoot = getSelectionRoot(root, range);

  if (!selectionRoot || !root.contains(selectionRoot)) {
    return false;
  }

  const selectedText = range.toString().trim();

  if (!selectedText) {
    return false;
  }

  const emphasis = document.createElement("em");

  try {
    range.surroundContents(emphasis);
  } catch {
    const fragment = range.extractContents();
    emphasis.appendChild(fragment);
    range.insertNode(emphasis);
  }

  root.normalize();

  const nextRange = document.createRange();
  nextRange.selectNodeContents(emphasis);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  emitInput(root);

  return true;
}

export function applyItalicToSelection(root: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const selectionRoot = getSelectionRoot(root, range);

  if (!selectionRoot || !root.contains(selectionRoot)) {
    return false;
  }

  const previousHtml = root.innerHTML;
  const docWithExec = document as Document & {
    execCommand?: (commandId: string, showUI?: boolean, value?: string) => boolean;
  };

  try {
    docWithExec.execCommand?.("styleWithCSS", false, "false");
    docWithExec.execCommand?.("italic", false);
  } catch {
    // Ignore and fall back below.
  }

  if (root.innerHTML !== previousHtml) {
    emitInput(root);
    return true;
  }

  return applyItalicFallback(root);
}
