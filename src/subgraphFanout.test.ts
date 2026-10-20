import { describe, expect, it } from "vitest";
import { connectNodes } from "./connections";
import { convertToSubgraph, groupSelection, projectGraph, ungroup } from "./graph";
import { DocumentError, emptyDocument, newNode, parseDocument } from "./model";
import { boundaryId, scopeGraph } from "./scopeGraph";

const fixture = {
  ...emptyDocument,
  nodes: [
    { ...newNode({ x: 0, y: 100 }), id: "load", label: "이미지 로드" },
    { ...newNode({ x: 340, y: 0 }), id: "vae", label: "VAE 인코드" },
    { ...newNode({ x: 680, y: 180 }), id: "preview", label: "이미지 미리보기" },
  ],
  edges: [
    { id: "encode", source: "load", target: "vae", label: "", dashed: false, arrow: true },
    { id: "image", source: "load", target: "preview", label: "이미지", dashed: false, arrow: true },
  ],
};

function converted() {
  const doc = convertToSubgraph(fixture, ["load", "vae"]);
  const group = doc.nodes.find((node) => node.subgraph);
  if (!group) throw new DocumentError("Missing subgraph fixture");
  return { doc, group };
}

describe("the same output branches inside and outside a subgraph", () => {
  it("exposes only the actual crossing output instead of guessing from the last node", () => {
    const { doc, group } = converted();
    expect(group.ports).toEqual([expect.objectContaining({ nodeId: "load", direction: "output" })]);
    expect(doc.edges).toEqual(fixture.edges);
    expect(projectGraph(doc).edges).toEqual([
      expect.objectContaining({ id: "image", source: group.id, target: "preview" }),
    ]);
    const inner = scopeGraph(doc, group);
    expect(inner.edges).toEqual([
      expect.objectContaining({ id: "encode", source: "load", target: "vae" }),
      expect.objectContaining({
        id: "image",
        source: "load",
        target: boundaryId(doc, group.id, "output"),
      }),
    ]);
  });
  it("reuses the same exposed output for a second external destination", () => {
    const { doc, group } = converted();
    const port = group.ports?.find((p) => p.nodeId === "load" && p.direction === "output");
    if (!port) throw new DocumentError("Missing output fixture");
    const destination = { ...newNode({ x: 680, y: 400 }), id: "other" };
    const connected = connectNodes(
      { ...doc, nodes: [...doc.nodes, destination] },
      { source: group.id, sourceHandle: port.id, target: "other", targetHandle: "in" },
      null,
    );
    expect(connected.edges.at(-1)).toMatchObject({ source: "load", target: "other" });
    expect(connected.nodes.find((n) => n.id === group.id)?.ports).toEqual(group.ports);
    expect(connected.edges.find((e) => e.id === "encode")).toEqual(fixture.edges[0]);
  });
  it("preserves the original graph after save, load and unpacking", () => {
    const { doc, group } = converted();
    const reopened = parseDocument(JSON.parse(JSON.stringify(doc)));
    const unpacked = ungroup(reopened, group.id);
    expect(unpacked.nodes).toEqual(fixture.nodes);
    expect(unpacked.edges).toEqual(fixture.edges);
  });
  it("retains the same internal source through nested subgraph conversion", () => {
    const { doc, group } = converted();
    const nested = convertToSubgraph(doc, ["load"]);
    const inner = nested.nodes.find((n) => n.subgraph && n.parent === group.id);
    if (!inner) throw new DocumentError("Missing nested subgraph fixture");
    expect(inner.ports).toEqual([expect.objectContaining({ nodeId: "load", direction: "output" })]);
    expect(scopeGraph(nested, nested.nodes.find((n) => n.id === group.id) ?? null).edges).toEqual([
      expect.objectContaining({ id: "encode", source: inner.id, target: "vae" }),
      expect.objectContaining({ id: "image", source: inner.id }),
    ]);
    expect(nested.edges).toEqual(fixture.edges);
  });
  it("does not guess an internal endpoint for a wire connected to a group frame", () => {
    const grouped = groupSelection(fixture, ["load", "vae"]);
    const group = grouped.nodes.find((n) => n.kind === "group");
    if (!group) throw new DocumentError("Missing group fixture");
    const ambiguous = {
      ...grouped,
      edges: [
        ...grouped.edges,
        {
          id: "frame",
          source: group.id,
          target: "preview",
          label: "",
          arrow: true,
          dashed: false,
        },
      ],
    };
    expect(convertToSubgraph(ambiguous, [group.id])).toBe(ambiguous);
  });
});
