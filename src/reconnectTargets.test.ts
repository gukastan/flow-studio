import { describe, expect, it } from "vitest";
import { reconnectTargets } from "./connections";
import { convertToSubgraph } from "./graph";
import { DocumentError, emptyDocument, newNode, parseDocument } from "./model";
import { boundaryId, scopeGraph } from "./scopeGraph";
import { realEdgeIdsForVisible, visibleEdgeBundles } from "./visibleEdges";

const fixture = {
  ...emptyDocument,
  nodes: ["start", "one", "two", "end", "other"].map((id, index) => ({
    ...newNode({ x: index * 300, y: index % 2 ? 100 : 0 }),
    id,
    label: id,
  })),
  edges: [
    { id: "in-one", source: "start", target: "one", label: "첫째", dashed: true, arrow: false },
    { id: "in-two", source: "start", target: "two", label: "둘째", dashed: false, arrow: true },
    { id: "out-one", source: "one", target: "end", label: "", dashed: false, arrow: true },
    { id: "out-two", source: "two", target: "end", label: "", dashed: false, arrow: true },
  ],
};

describe("moving a wire's arrow end", () => {
  it("changes only its destination and keeps the same wire metadata after saving", () => {
    const moved = reconnectTargets(fixture, new Set(["in-one"]), "other", "in-top", null);
    const loaded = parseDocument(JSON.parse(JSON.stringify(moved)));
    expect(loaded.edges[0]).toEqual({
      ...fixture.edges[0],
      target: "other",
      targetSide: "top",
    });
    expect(loaded.edges.slice(1)).toEqual(fixture.edges.slice(1));
    expect(reconnectTargets(moved, new Set(["in-one"]), "other", "in-top", null)).toBe(moved);
  });

  it("moves every real wire in an outer subgraph bundle but leaves their internal sources intact", () => {
    const doc = convertToSubgraph(fixture, ["one", "two"]);
    const group = doc.nodes.find((node) => node.subgraph);
    if (!group) throw new DocumentError("Missing subgraph fixture");
    const outer = visibleEdgeBundles(scopeGraph(doc, null)).find((bundle) =>
      bundle.memberIds.includes("out-one"),
    );
    if (!outer) throw new DocumentError("Missing outer wire fixture");
    const moved = reconnectTargets(
      doc,
      realEdgeIdsForVisible(doc, null, [outer.edge.id]),
      "other",
      "out-bottom",
      null,
    );
    expect(moved.edges.filter((edge) => edge.id.startsWith("out-"))).toEqual([
      { ...fixture.edges[2], target: "other", targetSide: "bottom" },
      { ...fixture.edges[3], target: "other", targetSide: "bottom" },
    ]);
    expect(
      visibleEdgeBundles(scopeGraph(moved, null)).find((bundle) => bundle.edge.target === "other")
        ?.memberIds,
    ).toEqual(["out-one", "out-two"]);
    expect(
      scopeGraph(moved, group).edges.filter(
        (edge) => edge.target === boundaryId(moved, group.id, "output"),
      ),
    ).toHaveLength(2);
    expect(parseDocument(moved).edges).toEqual(moved.edges);
  });

  it("keeps the old wire when the drop point cannot be connected", () => {
    const doc = convertToSubgraph(fixture, ["one", "two"]);
    const group = doc.nodes.find((node) => node.subgraph);
    if (!group) throw new DocumentError("Missing subgraph fixture");
    expect(() =>
      reconnectTargets(
        doc,
        new Set(["in-one"]),
        boundaryId(doc, group.id, "output"),
        null,
        group.id,
      ),
    ).toThrow(DocumentError);
    expect(() => reconnectTargets(doc, new Set(["in-one"]), "other", "invalid", null)).toThrow(
      DocumentError,
    );
    expect(doc.edges).toEqual(fixture.edges);
  });
});
