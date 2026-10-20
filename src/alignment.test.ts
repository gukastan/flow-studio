import { describe, expect, it } from "vitest";
import { alignSelection, canAlign } from "./alignment";
import { convertToSubgraph, groupSelection } from "./graph";
import { emptyDocument, newNode } from "./model";

const doc = {
  ...emptyDocument,
  nodes: [
    { ...newNode({ x: 100, y: 100 }), id: "a" },
    { ...newNode({ x: 500, y: 350 }), id: "b", height: 120 },
    { ...newNode({ x: 900, y: 600 }), id: "c" },
  ],
  edges: [{ id: "ab", source: "a", target: "b", label: "검증", dashed: true, arrow: true }],
};
describe("selection alignment", () => {
  it("places selected cards in a horizontal row with centered heights and preserves unrelated cards and links", () => {
    const result = alignSelection(doc, ["a", "b"], "horizontal");
    const [a, b, c] = result.nodes;
    expect(a && b && a.position.y + a.height / 2).toBe(b && b.position.y + b.height / 2);
    expect(b && a && b.position.x - a.position.x - a.width).toBe(64);
    expect(c).toEqual(doc.nodes[2]);
    expect(result.edges).toEqual(doc.edges);
    expect(doc.nodes[1]?.position).toEqual({ x: 500, y: 350 });
  });
  it("orders a vertical column by existing top-to-bottom order", () => {
    const result = alignSelection(doc, ["c", "a", "b"], "vertical");
    const [a, b, c] = result.nodes;
    expect(new Set(result.nodes.map((n) => n.position.x + n.width / 2)).size).toBe(1);
    expect(a && b && b.position.y - a.position.y - a.height).toBe(64);
    expect(b && c && c.position.y - b.position.y - b.height).toBe(64);
  });
  it("moves a group and its descendants once while preserving relative positions", () => {
    const grouped = groupSelection(doc, ["a", "b"]);
    const group = grouped.nodes.find((n) => n.kind === "group");
    if (!group) throw new Error("Expected fixture group");
    const result = alignSelection(grouped, [group.id, "a", "b", "c"], "vertical");
    const beforeA = grouped.nodes.find((n) => n.id === "a");
    const beforeB = grouped.nodes.find((n) => n.id === "b");
    const afterA = result.nodes.find((n) => n.id === "a");
    const afterB = result.nodes.find((n) => n.id === "b");
    expect(afterA && afterB && afterB.position.y - afterA.position.y).toBe(
      beforeA && beforeB && beforeB.position.y - beforeA.position.y,
    );
    expect(result.nodes.find((n) => n.id === group.id)?.width).toBe(group.width);
  });
  it("supports subgraph cards and rejects mixed parents or a single selection", () => {
    const grouped = convertToSubgraph(doc, ["a", "b"]);
    const group = grouped.nodes.find((n) => n.kind === "group");
    if (!group) throw new Error("Expected fixture subgraph");
    expect(canAlign(grouped, [group.id, "c"])).toBe(true);
    expect(alignSelection(grouped, ["a", "c"], "horizontal")).toBe(grouped);
    expect(alignSelection(doc, ["a"], "vertical")).toBe(doc);
  });
});
