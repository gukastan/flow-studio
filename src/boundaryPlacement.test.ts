import { describe, expect, it } from "vitest";
import { copySelection, pasteSelection, readSelection, serializeSelection } from "./clipboard";
import { convertToSubgraph, moveItems } from "./graph";
import type { Document, Port } from "./model";
import { DocumentError, emptyDocument, parseDocument } from "./model";
import { starter } from "./sample";
import { boundaryId, moveScopeItems, scopeGraph } from "./scopeGraph";

const doc = convertToSubgraph(starter, ["g"]);
const positions = new Map([
  [boundaryId(doc, "g", "input"), { x: -700, y: -200 }],
  [boundaryId(doc, "g", "output"), { x: 1500, y: 800 }],
]);
function boundary(current: Document, direction: Port["direction"], scope = "g") {
  const group = current.nodes.find((n) => n.id === scope);
  if (!group) throw new DocumentError("Missing fixture subgraph");
  const node = scopeGraph(current, group).nodes.find(
    (n) => n.id === boundaryId(current, scope, direction),
  );
  if (!node) throw new DocumentError("Missing fixture boundary");
  return node.position;
}

describe("manual subgraph boundary placement", () => {
  it("keeps default boundary cards fixed when only one inner node is dragged", () => {
    const input = boundary(doc, "input");
    const output = boundary(doc, "output");
    const moved = moveScopeItems(doc, new Map([["c", { x: 1200, y: 400 }]]), "g");
    expect(boundary(moved, "input")).toEqual(input);
    expect(boundary(moved, "output")).toEqual(output);
    expect(moved.nodes.find((n) => n.id === "c")?.position).toEqual({ x: 1200, y: 400 });
    expect(moved.nodes.find((n) => n.id === "b")?.position).toEqual(
      doc.nodes.find((n) => n.id === "b")?.position,
    );
  });
  it("moves either boundary independently without inserting nodes or changing connections", () => {
    const input = positions.get(boundaryId(doc, "g", "input"));
    if (!input) throw new DocumentError("Missing fixture input");
    const changed = moveScopeItems(doc, new Map([[boundaryId(doc, "g", "input"), input]]), "g");
    expect(boundary(changed, "input")).toEqual(input);
    expect(boundary(changed, "output")).toEqual(boundary(doc, "output"));
    expect(changed.nodes).toHaveLength(doc.nodes.length);
    expect(changed.nodes.filter((n) => n.id !== "g")).toEqual(
      doc.nodes.filter((n) => n.id !== "g"),
    );
    expect(changed.edges).toEqual(doc.edges);
    expect(scopeGraph(changed, changed.nodes.find((n) => n.id === "g") ?? null).edges).toEqual(
      scopeGraph(doc, doc.nodes.find((n) => n.id === "g") ?? null).edges,
    );
    const both = moveScopeItems(changed, positions, "g");
    expect(boundary(both, "input")).toEqual(input);
    expect(boundary(both, "output")).toEqual({ x: 1500, y: 800 });
  });
  it("keeps manual boundaries in place when inner nodes move", () => {
    const placed = moveScopeItems(doc, positions, "g");
    const moved = moveScopeItems(placed, new Map([["b", { x: -1200, y: -600 }]]), "g");
    expect(boundary(moved, "input")).toEqual(boundary(placed, "input"));
    expect(boundary(moved, "output")).toEqual(boundary(placed, "output"));
    expect(moved.nodes.find((n) => n.id === "b")?.position).toEqual({ x: -1200, y: -600 });
  });
  it("carries the boundary layout when the wrapper or a containing subgraph moves", () => {
    const placed = moveScopeItems(doc, positions, "g");
    const nested = convertToSubgraph(placed, ["a", "g"]);
    const parent = nested.nodes.find((n) => !placed.nodes.some((old) => old.id === n.id));
    if (!parent) throw new DocumentError("Missing containing fixture subgraph");
    for (const id of ["g", parent.id]) {
      const owner = nested.nodes.find((n) => n.id === id);
      if (!owner) throw new DocumentError("Missing fixture owner");
      const moved = moveItems(
        nested,
        new Map([[id, { x: owner.position.x + 420, y: owner.position.y - 180 }]]),
      );
      for (const direction of ["input", "output"] as const) {
        const before = boundary(nested, direction);
        expect(boundary(moved, direction)).toEqual({ x: before.x + 420, y: before.y - 180 });
      }
    }
  });
  it("preserves the layout through project parsing and copying to a new location", () => {
    const placed = moveScopeItems(doc, positions, "g");
    expect(parseDocument(JSON.parse(JSON.stringify(placed)))).toEqual(placed);
    const copied = readSelection(serializeSelection(copySelection(placed, ["g"])));
    const pasted = pasteSelection(emptyDocument, copied, {
      parent: null,
      position: { x: 2000, y: 1000 },
    });
    const old = placed.nodes.find((n) => n.id === "g");
    const id = pasted.selected[0];
    if (!old || !id) throw new DocumentError("Missing copied fixture");
    for (const direction of ["input", "output"] as const) {
      const before = boundary(placed, direction);
      expect(boundary(pasted.doc, direction, id)).toEqual({
        x: before.x + 2000 - old.position.x,
        y: before.y + 1000 - old.position.y,
      });
    }
  });
  it("validates boundary offsets and only permits them on subgraphs", () => {
    for (const [id, x] of [
      ["g", Number.NaN],
      ["a", 10],
    ] as const) {
      expect(() =>
        parseDocument({
          ...doc,
          nodes: doc.nodes.map((n) =>
            n.id === id ? { ...n, boundaryOffsets: { input: { x, y: 0 } } } : n,
          ),
        }),
      ).toThrow(DocumentError);
    }
  });
});
