import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDocument, newNode } from "./model";
import { loadWorkflows, persistWorkflows } from "./workflowStorage";

describe("workflow storage", () => {
  beforeEach(() => localStorage.clear());

  it("preserves the existing single-document save as the first workflow", () => {
    const doc = { ...emptyDocument, title: "기존 작업", nodes: [newNode({ x: 12, y: 34 })] };
    const saved = JSON.stringify(doc);
    localStorage.setItem("flow-studio.document.v1", saved);
    const restored = loadWorkflows();
    expect(restored.items).toHaveLength(1);
    expect(restored.items[0]?.doc).toEqual(doc);
    expect(restored.activeId).toBe(restored.items[0]?.id);
    expect(localStorage.getItem("flow-studio.document.v1")).toBe(saved);
  });

  it("round-trips all documents and the selected workflow", () => {
    const saved = {
      activeId: "second",
      items: [
        { id: "first", doc: { ...emptyDocument, title: "첫 작업" } },
        { id: "second", doc: { ...emptyDocument, nodes: [newNode({ x: 50, y: 60 })] } },
      ],
    };
    expect(persistWorkflows(saved)).toBe("");
    expect(loadWorkflows()).toEqual({ ...saved, warning: "" });
  });

  it("rejects duplicate workflow identities and reports damaged storage", () => {
    localStorage.setItem(
      "flow-studio.workflows.v1",
      JSON.stringify({
        version: 1,
        activeId: "duplicate",
        items: [
          { id: "duplicate", doc: emptyDocument },
          { id: "duplicate", doc: emptyDocument },
        ],
      }),
    );
    expect(loadWorkflows().warning).not.toBe("");
  });

  it("reports quota failures without pretending the changes were saved", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    try {
      expect(
        persistWorkflows({ activeId: "one", items: [{ id: "one", doc: emptyDocument }] }),
      ).not.toBe("");
    } finally {
      spy.mockRestore();
    }
  });
});
