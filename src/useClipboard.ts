import { useEffect, useLayoutEffect, useRef } from "react";
import { copySelection, pasteSelection, readSelection, serializeSelection } from "./clipboard";
import { selectionRoots } from "./graph";
import { hasOpenOverlay, isTextEditing } from "./keyboard";
import type { Document, Point } from "./model";
import { DocumentError } from "./model";

type Options = {
  readonly doc: Document;
  readonly selected: readonly string[];
  readonly parent: string | null;
  readonly position: () => Point;
  readonly commit: (doc: Document) => void;
  readonly select: (ids: string[]) => void;
  readonly notice: (message: string) => void;
};

export function useClipboard(options: Options) {
  const current = useRef(options);
  useLayoutEffect(() => {
    current.current = options;
  }, [options]);
  const memory = useRef("");
  const offset = useRef(0);
  function snapshot(): string {
    const state = current.current;
    if (!state.selected.length) return "";
    memory.current = serializeSelection(copySelection(state.doc, state.selected));
    offset.current = 0;
    return memory.current;
  }
  function insert(text: string, at?: Point) {
    const state = current.current;
    try {
      const selection = readSelection(text);
      if (text !== memory.current) offset.current = 0;
      const center = at ?? state.position();
      const result = pasteSelection(state.doc, selection, {
        parent: state.parent,
        position: at ?? { x: center.x + offset.current, y: center.y + offset.current },
      });
      state.commit(result.doc);
      state.select(result.selected);
      memory.current = text;
      offset.current += 32;
    } catch (error) {
      if (error instanceof DocumentError) state.notice(error.message);
      else throw error;
    }
  }
  async function copy() {
    const text = snapshot();
    if (!text) return;
    if (!navigator.clipboard) {
      current.current.notice("항목을 복사했습니다. 이 편집기에서 붙여넣을 수 있습니다.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      current.current.notice("선택한 항목과 내부 연결을 복사했습니다.");
    } catch (error) {
      if (error instanceof Error)
        current.current.notice("시스템 클립보드에 접근할 수 없어 편집기 안에 복사했습니다.");
      else throw error;
    }
  }
  async function paste(at?: Point) {
    let text = memory.current;
    if (navigator.clipboard) {
      try {
        text = await navigator.clipboard.readText();
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        if (!text) {
          current.current.notice(
            "클립보드 접근이 허용되지 않았습니다. ⌘V / Ctrl+V를 사용해 주세요.",
          );
          return;
        }
      }
    }
    insert(text, at);
  }
  function duplicate() {
    const state = current.current;
    const roots = selectionRoots(state.doc, state.selected);
    if (!roots.length) return;
    try {
      const result = pasteSelection(state.doc, copySelection(state.doc, state.selected), {
        parent: roots.every((n) => n.parent === roots[0]?.parent)
          ? (roots[0]?.parent ?? null)
          : state.parent,
        position: {
          x: Math.min(...roots.map((n) => n.position.x)) + 40,
          y: Math.min(...roots.map((n) => n.position.y)) + 40,
        },
      });
      state.commit(result.doc);
      state.select(result.selected);
    } catch (error) {
      if (error instanceof DocumentError) state.notice(error.message);
      else throw error;
    }
  }
  useEffect(() => {
    function onCopy(event: ClipboardEvent) {
      if (isTextEditing(event.target) || hasOpenOverlay() || !window.getSelection()?.isCollapsed)
        return;
      if (!current.current.selected.length) return;
      event.clipboardData?.setData("text/plain", snapshot());
      event.preventDefault();
    }
    function onPaste(event: ClipboardEvent) {
      if (isTextEditing(event.target) || hasOpenOverlay()) return;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!text.includes('"flow-studio/selection"')) return;
      event.preventDefault();
      insert(text);
    }
    window.addEventListener("copy", onCopy);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("paste", onPaste);
    };
  });
  return { copy, paste, duplicate };
}
