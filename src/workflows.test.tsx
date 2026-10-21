import { act } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentError, emptyDocument, newNode } from "./model";
import { useDocument } from "./useDocument";
import { WorkflowTabs } from "./WorkflowTabs";
import { loadWorkflows } from "./workflowStorage";

let history: ReturnType<typeof useDocument>;
function Harness({ canClose = true }: { canClose?: boolean }) {
  history = useDocument();
  return (
    <WorkflowTabs
      workflows={history.workflows}
      activeId={history.activeId}
      onSelect={history.selectWorkflow}
      onAdd={history.addWorkflow}
      onClose={(id) => {
        if (!canClose) return false;
        history.closeWorkflow(id);
        return true;
      }}
    />
  );
}
function button(selector: string) {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLButtonElement)) throw new DocumentError("Missing test button");
  return element;
}

describe("workflow tabs", () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem("flow-studio.document.v1", JSON.stringify(emptyDocument));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root.render(<Harness />));
  });
  afterEach(() => {
    act(() => root.unmount());
    document.body.replaceChildren();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("adds an empty tab without losing the original document or its undo history", () => {
    const first = history.activeId;
    const node = newNode({ x: 200, y: 200 });
    act(() => history.commit({ ...history.doc, title: "첫 번째", nodes: [node] }));
    act(() => button('[aria-label="워크플로우 추가"]').click());
    const second = history.activeId;
    expect(second).not.toBe(first);
    expect(history.doc.nodes).toEqual([]);
    expect(history.canUndo).toBe(false);
    expect(document.activeElement?.id).toBe(`workflow-tab-${second}`);
    act(() => history.commit({ ...history.doc, title: "두 번째" }));
    act(() => history.selectWorkflow(first));
    expect(history.doc.nodes).toEqual([node]);
    act(() => history.undo());
    expect(history.doc).toEqual(emptyDocument);
    act(() => history.selectWorkflow(second));
    expect(history.doc.title).toBe("두 번째");
    expect(history.canRedo).toBe(false);
    act(() => history.selectWorkflow(first));
    act(() => history.redo());
    expect(history.doc.nodes).toEqual([node]);
    expect(button('[aria-selected="true"]').textContent).toBe("첫 번째");
  });

  it("restores every tab and the active document after remount", () => {
    const first = history.activeId;
    act(() => history.commit({ ...history.doc, title: "보관할 작업" }));
    act(() => history.addWorkflow());
    const second = history.activeId;
    act(() => history.commit({ ...history.doc, nodes: [newNode({ x: 20, y: 30 })] }));
    act(() => vi.advanceTimersByTime(400));
    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<Harness />));
    expect(history.activeId).toBe(second);
    expect(history.doc.nodes).toHaveLength(1);
    expect(history.workflows).toHaveLength(2);
    act(() => history.selectWorkflow(first));
    expect(history.doc.title).toBe("보관할 작업");
  });

  it("flushes the latest batched edits on pagehide before the debounce expires", () => {
    act(() => {
      history.commit({ ...history.doc, title: "마지막 변경" });
      history.addWorkflow();
      window.dispatchEvent(new Event("pagehide"));
    });
    const restored = loadWorkflows();
    expect(restored.items[0]?.doc.title).toBe("마지막 변경");
    expect(restored.activeId).toBe(history.activeId);
    expect(restored.items).toHaveLength(2);
  });

  it("keeps an in-flight import bound to the workflow where it started", () => {
    const first = history.activeId;
    const finishImport = history.commit;
    act(() => history.addWorkflow());
    const secondDoc = history.doc;
    act(() => finishImport({ ...emptyDocument, title: "가져온 문서" }));
    expect(history.doc).toBe(secondDoc);
    act(() => history.selectWorkflow(first));
    expect(history.doc.title).toBe("가져온 문서");
  });

  it("uses arrow and Home/End keys to select tabs with one tab stop", () => {
    act(() => history.addWorkflow());
    act(() => history.addWorkflow());
    const last = history.activeId;
    const press = (key: string) =>
      act(() =>
        button('[aria-selected="true"]').dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        ),
      );
    press("Home");
    expect(history.activeId).toBe(history.workflows[0]?.id);
    press("ArrowRight");
    expect(history.activeId).toBe(history.workflows[1]?.id);
    press("End");
    expect(history.activeId).toBe(last);
    press("ArrowRight");
    expect(history.activeId).toBe(history.workflows[0]?.id);
    expect(document.querySelectorAll('[role="tab"][tabindex="0"]')).toHaveLength(1);
    expect(document.activeElement?.id).toBe(`workflow-tab-${history.activeId}`);
  });

  it("keeps drag updates as one undo step on their originating workflow", () => {
    const first = history.activeId;
    act(() => history.startDrag());
    act(() => history.drag((doc) => ({ ...doc, title: "이동 1" })));
    act(() => history.drag((doc) => ({ ...doc, title: "이동 2" })));
    act(() => history.endDrag());
    act(() => history.addWorkflow());
    act(() => history.selectWorkflow(first));
    act(() => history.undo());
    expect(history.doc).toEqual(emptyDocument);
    expect(history.canUndo).toBe(false);
  });

  it("closes an inactive tab without switching or altering the active document history", () => {
    // Given
    const first = history.activeId;
    act(() => history.addWorkflow());
    const second = history.activeId;
    act(() => history.commit({ ...history.doc, title: "현재 작업" }));
    const currentDoc = history.doc;
    // When
    act(() => button(`#workflow-tab-${first} + button`).click());
    // Then
    expect(history.workflows.map((item) => item.id)).toEqual([second]);
    expect(history.activeId).toBe(second);
    expect(history.doc).toBe(currentDoc);
    expect(history.canUndo).toBe(true);
    expect(document.activeElement?.id).toBe(`workflow-tab-${second}`);
  });

  it.each([
    { closed: 1, next: 2 },
    { closed: 2, next: 1 },
  ])("selects neighbor $next when active tab $closed is closed", ({ closed, next }) => {
    // Given
    act(() => history.addWorkflow());
    act(() => history.addWorkflow());
    const ids = history.workflows.map((item) => item.id);
    const closingId = ids[closed];
    if (!closingId) throw new DocumentError("Missing workflow fixture");
    act(() => history.selectWorkflow(closingId));
    // When
    act(() => button(`#workflow-tab-${closingId} + button`).click());
    // Then
    expect(history.activeId).toBe(ids[next]);
    expect(history.workflows).toHaveLength(2);
    expect(document.activeElement?.id).toBe(`workflow-tab-${ids[next]}`);
  });

  it("replaces the last closed tab with a blank workflow and fresh history", () => {
    // Given
    const closed = history.activeId;
    act(() => history.commit({ ...history.doc, nodes: [newNode({ x: 20, y: 30 })] }));
    // When
    act(() => button(`#workflow-tab-${closed} + button`).click());
    // Then
    expect(history.activeId).not.toBe(closed);
    expect(history.workflows).toHaveLength(1);
    expect(history.doc).toEqual({ ...emptyDocument, title: "워크플로우 1" });
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it("does not restore closed tabs from browser storage", () => {
    // Given
    const first = history.activeId;
    act(() => history.addWorkflow());
    act(() => vi.advanceTimersByTime(400));
    // When
    act(() => history.closeWorkflow(history.activeId));
    act(() => vi.advanceTimersByTime(400));
    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<Harness />));
    // Then
    expect(history.activeId).toBe(first);
    expect(history.workflows.map((item) => item.id)).toEqual([first]);
  });

  it("keeps a tab and its contents when closing is cancelled", () => {
    // Given
    act(() => root.render(<Harness canClose={false} />));
    const original = history.doc;
    const id = history.activeId;
    // When
    act(() => button(`#workflow-tab-${id} + button`).click());
    // Then
    expect(history.activeId).toBe(id);
    expect(history.doc).toBe(original);
    expect(history.workflows).toHaveLength(1);
  });

  it("closes the focused tab with Delete without selecting another tab first", () => {
    // Given
    const first = history.activeId;
    act(() => history.addWorkflow());
    const target = button('[aria-selected="true"]');
    target.focus();
    // When
    act(() => target.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })));
    // Then
    expect(history.activeId).toBe(first);
    expect(history.workflows).toHaveLength(1);
    expect(document.activeElement?.id).toBe(`workflow-tab-${first}`);
  });

  it("ignores a late import for a closed workflow", () => {
    // Given
    const finishImport = history.commit;
    act(() => history.closeWorkflow(history.activeId));
    const blank = history.doc;
    // When
    act(() => finishImport({ ...emptyDocument, title: "늦게 도착한 문서" }));
    // Then
    expect(history.doc).toBe(blank);
    expect(history.workflows).toHaveLength(1);
  });
});
