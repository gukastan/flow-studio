import { describe, expect, it } from "vitest";
import { canDistribute, distributeSelection } from "./alignment";
import { convertToSubgraph, groupSelection } from "./graph";
import { emptyDocument, newNode } from "./model";

const doc = {
  ...emptyDocument,
  nodes: [
    { ...newNode({ x: 100, y: 100 }), id: "a" },
    { ...newNode({ x: 500, y: 350 }), id: "b", width: 300, height: 120 },
    { ...newNode({ x: 1100, y: 900 }), id: "c" },
    { ...newNode({ x: 2000, y: 1600 }), id: "d" },
  ],
  edges: [{ id: "ab", source: "a", target: "b", label: "검증", dashed: true, arrow: true }],
};
describe("selection spacing", () => {
  it("equalizes horizontal edge gaps with different widths, keeping endpoints and all y positions", () => {
    const result = distributeSelection(doc, ["c", "a", "b"], "horizontal");
    expect(result.nodes[1]?.position).toEqual({ x: 562, y: 350 });
    expect(result.nodes.filter((n) => n.id !== "b")).toEqual(doc.nodes.filter((n) => n.id !== "b"));
    expect(result.edges).toEqual(doc.edges);
    expect(doc.nodes[1]?.position).toEqual({ x: 500, y: 350 });
  });
  it("equalizes vertical edge gaps with different heights, keeping endpoints and all x positions", () => {
    const result = distributeSelection(doc, ["c", "b", "a"], "vertical");
    expect(result.nodes[1]?.position).toEqual({ x: 500, y: 484 });
    expect(result.nodes.filter((n) => n.id !== "b")).toEqual(doc.nodes.filter((n) => n.id !== "b"));
    expect(result.edges).toEqual(doc.edges);
  });
  it("preserves fixed endpoints even when there is not enough room for positive gaps", () => {
    const crowded = {
      ...doc,
      nodes: doc.nodes.map((n, index) => ({ ...n, position: { x: index * 50, y: index * 20 } })),
    };
    const result = distributeSelection(crowded, ["a", "b", "c"], "horizontal");
    expect(result.nodes[1]?.position).toEqual({ x: 12, y: 20 });
    expect(result.nodes[0]).toEqual(crowded.nodes[0]);
    expect(result.nodes[2]).toEqual(crowded.nodes[2]);
  });
  it("moves group descendants exactly once and preserves their relative positions", () => {
    const grouped = groupSelection(doc, ["b"]);
    const group = grouped.nodes.find((n) => n.kind === "group");
    if (!group) throw new Error("Expected fixture group");
    const result = distributeSelection(grouped, ["a", group.id, "b", "c"], "horizontal");
    const afterGroup = result.nodes.find((n) => n.id === group.id);
    const afterB = result.nodes.find((n) => n.id === "b");
    expect(afterGroup?.position).toEqual({ x: 530, y: group.position.y });
    expect(afterB?.position).toEqual({ x: 562, y: 350 });
    expect(afterGroup?.width).toBe(group.width);
    expect(result.nodes.find((n) => n.id === "a")).toEqual(doc.nodes[0]);
    expect(result.nodes.find((n) => n.id === "c")).toEqual(doc.nodes[2]);
  });
  it("uses the visible size of folded groups and supports subgraph cards", () => {
    const grouped = groupSelection(doc, ["b"]);
    const group = grouped.nodes.find((n) => n.kind === "group");
    if (!group) throw new Error("Expected fixture group");
    const folded = {
      ...grouped,
      nodes: grouped.nodes.map((n) => (n.id === group.id ? { ...n, collapsed: true } : n)),
    };
    const result = distributeSelection(folded, ["a", group.id, "c"], "horizontal");
    expect(result.nodes.find((n) => n.id === group.id)?.position.x).toBe(600);
    const subgraph = convertToSubgraph(grouped, [group.id]);
    expect(canDistribute(subgraph, ["a", group.id, "c"])).toBe(true);
    expect(distributeSelection(subgraph, ["a", group.id, "c"], "horizontal").nodes.length).toBe(
      subgraph.nodes.length,
    );
  });
  it("requires three sibling roots and ignores invalid or insufficient selections", () => {
    const grouped = groupSelection(doc, ["a", "b"]);
    const group = grouped.nodes.find((n) => n.kind === "group");
    if (!group) throw new Error("Expected fixture group");
    expect(canDistribute(doc, ["a", "b", "c"])).toBe(true);
    for (const ids of [[], ["a"], ["a", "b"], ["a", "a", "b"], ["missing", "a", "b"]]) {
      expect(canDistribute(doc, ids)).toBe(false);
      expect(distributeSelection(doc, ids, "vertical")).toBe(doc);
    }
    expect(canDistribute(grouped, [group.id, "a", "b", "c"])).toBe(false);
    expect(distributeSelection(grouped, ["a", "b", "c"], "horizontal")).toBe(grouped);
  });
});
