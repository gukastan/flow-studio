import { describe, expect, it } from "vitest";
import { copySelection, pasteSelection, readSelection, serializeSelection } from "./clipboard";
import { convertToSubgraph } from "./graph";
import { DocumentError, emptyDocument, newNode, parseDocument } from "./model";
import { starter } from "./sample";

describe("graph clipboard", () => {
  it("copies a group once with all descendants and only its internal links", () => {
    // Given
    const ids = ["g", "b", "c"];
    // When
    const selection = copySelection(starter, ids);
    // Then
    expect(selection.nodes.map((n) => n.id)).toEqual(["g", "b", "c"]);
    expect(selection.edges.map((e) => [e.source, e.target])).toEqual([
      ["b", "c"],
      ["c", "b"],
    ]);
  });
  it("pastes with fresh IDs and remaps every internal connection and parent", () => {
    // Given
    const copied = copySelection(starter, ["g"]);
    // When
    const result = pasteSelection(starter, copied, { parent: null, position: { x: 1000, y: 500 } });
    // Then
    const added = result.doc.nodes.filter((n) => !starter.nodes.some((old) => old.id === n.id));
    const ids = new Set(added.map((n) => n.id));
    expect(added).toHaveLength(3);
    expect(added.find((n) => !n.parent)?.position).toEqual({ x: 1000, y: 500 });
    expect(added.filter((n) => n.parent).every((n) => n.parent === result.selected[0])).toBe(true);
    expect(
      result.doc.edges
        .slice(starter.edges.length)
        .every((e) => ids.has(e.source) && ids.has(e.target)),
    ).toBe(true);
    expect(parseDocument(result.doc)).toEqual(result.doc);
  });
  it("pastes into the destination subgraph instead of the original parent", () => {
    // Given
    const doc = convertToSubgraph(starter, ["g"]);
    const copied = copySelection(doc, ["a"]);
    // When
    const result = pasteSelection(doc, copied, { parent: "g", position: { x: 400, y: 400 } });
    // Then
    expect(result.doc.nodes.at(-1)).toMatchObject({ parent: "g", position: { x: 400, y: 400 } });
    expect(result.doc.edges).toEqual(doc.edges);
  });
  it("preserves nested subgraphs and remaps exposed slots across a clipboard roundtrip", () => {
    // Given
    const nested = convertToSubgraph(convertToSubgraph(starter, ["b"]), ["g"]);
    const copied = readSelection(serializeSelection(copySelection(nested, ["g"])));
    // When
    const result = pasteSelection(nested, copied, { parent: null, position: { x: 1000, y: 500 } });
    // Then
    const added = result.doc.nodes.slice(nested.nodes.length);
    const ids = new Set(added.map((n) => n.id));
    expect(added.filter((n) => n.subgraph)).toHaveLength(2);
    expect(added.flatMap((n) => n.ports ?? []).every((p) => ids.has(p.nodeId))).toBe(true);
    expect(parseDocument(JSON.parse(JSON.stringify(result.doc)))).toEqual(result.doc);
  });
  it("gives repeated pastes independent identities", () => {
    // Given
    const copied = copySelection(starter, ["a", "g"]);
    const once = pasteSelection(starter, copied, { parent: null, position: { x: 1000, y: 500 } });
    // When
    const twice = pasteSelection(once.doc, copied, { parent: null, position: { x: 1040, y: 540 } });
    // Then
    expect(new Set(twice.doc.nodes.map((n) => n.id)).size).toBe(twice.doc.nodes.length);
    expect(new Set(twice.doc.edges.map((e) => e.id)).size).toBe(twice.doc.edges.length);
    expect(twice.selected.some((id) => once.selected.includes(id))).toBe(false);
  });
  it("rejects unrelated text and dangling copied references", () => {
    // Given
    const invalid = serializeSelection({
      ...copySelection(starter, ["a"]),
      edges: [...starter.edges],
    });
    // When / Then
    expect(() => readSelection("ordinary text")).toThrow(DocumentError);
    expect(() => readSelection(invalid)).toThrow(DocumentError);
  });
  it("rejects pasting beyond the project size limit without modifying it", () => {
    // Given
    const node = newNode({ x: 0, y: 0 });
    const doc = parseDocument({
      ...emptyDocument,
      nodes: Array.from({ length: 1000 }, (_, i) => ({ ...node, id: `limit_${i}` })),
    });
    // When / Then
    expect(() =>
      pasteSelection(doc, copySelection(starter, ["g"]), {
        parent: null,
        position: { x: 0, y: 0 },
      }),
    ).toThrow(DocumentError);
  });
});
