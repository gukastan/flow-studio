import { describe, expect, it } from "vitest";
import { convertToSubgraph } from "./graph";
import { DocumentError, emptyDocument, newNode, parseDocument } from "./model";
import { scopeGraph } from "./scopeGraph";
import { realEdgeIdsForVisible, visibleEdgeBundles } from "./visibleEdges";

const fixture = {
  ...emptyDocument,
  nodes: ["start", "one", "two", "end"].map((id, index) => ({
    ...newNode({ x: index * 300, y: index % 2 ? 100 : 0 }),
    id,
    label: id,
  })),
  edges: [
    { id: "in-one", source: "start", target: "one", label: "첫째", dashed: false, arrow: true },
    { id: "in-two", source: "start", target: "two", label: "둘째", dashed: false, arrow: true },
    { id: "out-one", source: "one", target: "end", label: "", dashed: false, arrow: true },
    { id: "out-two", source: "two", target: "end", label: "", dashed: false, arrow: true },
  ],
};

describe("visible subgraph connections", () => {
  it("draws one outer wire per neighbor while retaining all four inner wires", () => {
    const doc = convertToSubgraph(fixture, ["one", "two"]);
    const group = doc.nodes.find((node) => node.subgraph);
    if (!group) throw new DocumentError("Missing fixture subgraph");

    const outer = visibleEdgeBundles(scopeGraph(doc, null));
    expect(outer).toHaveLength(2);
    expect(outer.map((bundle) => [bundle.edge.source, bundle.edge.target])).toEqual([
      ["start", group.id],
      [group.id, "end"],
    ]);
    expect(outer.map((bundle) => bundle.memberIds)).toEqual([
      ["in-one", "in-two"],
      ["out-one", "out-two"],
    ]);
    expect(outer[0]?.edge.label).toBe("");
    expect(visibleEdgeBundles(scopeGraph(doc, group))).toHaveLength(4);
    expect(parseDocument(doc).edges).toEqual(fixture.edges);
  });

  it("edits or deletes the full outer bundle, but only one wire inside", () => {
    const doc = convertToSubgraph(fixture, ["one", "two"]);
    const group = doc.nodes.find((node) => node.subgraph);
    if (!group) throw new DocumentError("Missing fixture subgraph");
    expect([...realEdgeIdsForVisible(doc, null, ["in-one"])]).toEqual(["in-one", "in-two"]);
    expect([...realEdgeIdsForVisible(doc, group, ["in-one"])]).toEqual(["in-one"]);
  });

  it("keeps parallel wires between ordinary nodes separate", () => {
    const doc = {
      ...fixture,
      edges: [
        {
          id: "parallel-one",
          source: "start",
          target: "one",
          label: "",
          dashed: false,
          arrow: true,
        },
        {
          id: "parallel-two",
          source: "start",
          target: "one",
          label: "",
          dashed: false,
          arrow: true,
        },
      ],
    };
    expect(visibleEdgeBundles(scopeGraph(doc, null))).toHaveLength(2);
  });
});
