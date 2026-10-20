import { describe, expect, it } from "vitest";
import { fitGroups, groupSelection, moveItems, projectGraph, removeItems, ungroup } from "./graph";
import { autoLayout } from "./layout";
import { importMermaid } from "./mermaid";
import { DocumentError, parseDocument } from "./model";
import { SAMPLE, starter } from "./sample";

describe("Mermaid import", () => {
  it("keeps all branches and return edges when importing the Korean example", async () => {
    // Given
    const source = SAMPLE;
    // When
    const doc = await importMermaid(source);
    // Then
    expect(doc.nodes).toHaveLength(10);
    expect(doc.edges).toHaveLength(11);
    expect(doc.edges.find((e) => e.source === "I" && e.target === "F")).toBeDefined();
    expect(doc.edges.find((e) => e.target === "J")?.label).toBe("근거 부족·수정 한도 도달");
    expect(doc.nodes.find((n) => n.id === "G")?.shape).toBe("decision");
    expect(doc.nodes.every((n) => Number.isFinite(n.position.x))).toBe(true);
  });
  it("preserves direct parent relationships for nested subgraphs", async () => {
    // Given
    const source = `flowchart LR
      subgraph outer[전체]
        subgraph inner[검토]
          A[초안] --> B[확인]
        end
        C[완성]
      end
      B --> C
      X[시작] --> A`;
    // When
    const doc = await importMermaid(source);
    // Then
    expect(doc.nodes.find((n) => n.id === "A")?.parent).toBe("inner");
    expect(doc.nodes.find((n) => n.id === "inner")?.parent).toBe("outer");
    expect(doc.nodes.find((n) => n.id === "C")?.parent).toBe("outer");
    expect(doc.nodes.find((n) => n.id === "X")?.parent).toBeNull();
  });
  it("rejects invalid Mermaid without producing a partial graph", async () => {
    // Given
    const source = "flowchart TD\nA[broken -->";
    // When / Then
    await expect(importMermaid(source)).rejects.toBeDefined();
  });
});
describe("editable groups", () => {
  it("projects only boundary links when collapsing a group", () => {
    // Given
    const doc = {
      ...starter,
      nodes: starter.nodes.map((n) => (n.id === "g" ? { ...n, collapsed: true } : n)),
    };
    // When
    const visible = projectGraph(doc);
    // Then
    expect(visible.nodes.map((n) => n.id)).toEqual(["a", "g", "d"]);
    expect(visible.edges.map((e) => [e.source, e.target])).toEqual([
      ["a", "g"],
      ["g", "d"],
    ]);
    expect(doc.edges.find((e) => e.id === "ab")?.target).toBe("b");
  });
  it("moves hidden descendants together when dragging a collapsed group", () => {
    // Given
    const doc = fitGroups(starter);
    const group = doc.nodes.find((n) => n.id === "g");
    if (!group) throw new DocumentError("fixture");
    // When
    const moved = moveItems(
      doc,
      new Map([["g", { x: group.position.x + 100, y: group.position.y + 60 }]]),
    );
    // Then
    expect(moved.nodes.find((n) => n.id === "b")?.position).toEqual({ x: 472, y: 220 });
    expect(moved.nodes.find((n) => n.id === "a")?.position).toEqual({ x: 40, y: 160 });
  });
  it("does not move a selected child twice when its parent is also selected", () => {
    // Given
    const doc = fitGroups(starter);
    const g = doc.nodes.find((n) => n.id === "g");
    if (!g) throw new DocumentError("fixture");
    // When
    const moved = moveItems(
      doc,
      new Map([
        ["g", { x: g.position.x + 100, y: g.position.y }],
        ["b", { x: 472, y: 160 }],
      ]),
    );
    // Then
    expect(moved.nodes.find((n) => n.id === "b")?.position.x).toBe(472);
  });
  it("allows nesting whole groups and restores children on ungroup", () => {
    // Given
    const grouped = groupSelection(starter, ["a", "g"]);
    const added = grouped.nodes.find((n) => !starter.nodes.some((s) => s.id === n.id));
    if (!added) throw new DocumentError("fixture");
    // When
    const result = ungroup(grouped, added.id);
    // Then
    expect(result.nodes.find((n) => n.id === "g")?.parent).toBeNull();
    expect(result.nodes.find((n) => n.id === "b")?.parent).toBe("g");
    expect(result.edges).toEqual(starter.edges);
  });
  it("removes descendant links when deleting their parent group", () => {
    // Given
    const doc = starter;
    // When
    const result = removeItems(doc, ["g"]);
    // Then
    expect(result.nodes.map((n) => n.id)).toEqual(["a", "d"]);
    expect(result.edges).toHaveLength(0);
  });
  it("keeps every child inside its group after automatic layout", () => {
    // Given
    const doc = starter;
    // When
    const result = autoLayout(doc);
    // Then
    for (const n of result.nodes.filter((n) => n.parent)) {
      const parent = result.nodes.find((p) => p.id === n.parent);
      expect(parent).toBeDefined();
      expect(n.position.x).toBeGreaterThan(parent?.position.x ?? Infinity);
      expect(n.position.y).toBeGreaterThan(parent?.position.y ?? Infinity);
    }
  });
});
describe("project files", () => {
  it("round trips positions, colors, hierarchy and collapsed state", () => {
    // Given
    const doc = {
      ...starter,
      nodes: starter.nodes.map((n) =>
        n.id === "g" ? { ...n, collapsed: true, color: "#fb7185" } : n,
      ),
    };
    // When
    const reopened = parseDocument(JSON.parse(JSON.stringify(doc)));
    // Then
    expect(reopened).toEqual(doc);
  });
  it("rejects cycles in nested groups", () => {
    // Given
    const doc = {
      ...starter,
      nodes: starter.nodes.map((n) => (n.id === "g" ? { ...n, parent: "g" } : n)),
    };
    // When / Then
    expect(() => parseDocument(doc)).toThrow(DocumentError);
  });
  it("rejects dangling links and invalid formats", () => {
    // Given
    const doc = { ...starter, nodes: [] };
    // When / Then
    expect(() => parseDocument(doc)).toThrow(DocumentError);
    expect(() => parseDocument({ nodes: [] })).toThrow(DocumentError);
  });
});
