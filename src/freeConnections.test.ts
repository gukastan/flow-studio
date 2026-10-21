import { describe, expect, it } from "vitest";
import { copySelection, pasteSelection } from "./clipboard";
import { CONNECTION_SIDES, endpointPorts, NODE_HANDLES, portHandle } from "./connectionHandles";
import { connectNodes } from "./connections";
import { convertToSubgraph, projectGraph, ungroup } from "./graph";
import { DocumentError, emptyDocument, newNode, parseDocument } from "./model";
import { boundaryId, scopeGraph } from "./scopeGraph";

const fixture = {
  ...emptyDocument,
  nodes: ["a", "b", "c"].map((id, index) => ({
    ...newNode({ x: index * 300, y: 0 }),
    id,
    label: id,
  })),
};

describe("direction chosen by the drag", () => {
  it.each(
    CONNECTION_SIDES.flatMap((source) =>
      CONNECTION_SIDES.map((target) => [source, target] as const),
    ),
  )(
    "retains a → b when dragging %s to %s and loading the saved document",
    (sourceSide, targetSide) => {
      // Given
      const connected = connectNodes(
        fixture,
        {
          source: "a",
          target: "b",
          sourceHandle: NODE_HANDLES[sourceSide],
          targetHandle: NODE_HANDLES[targetSide],
        },
        null,
      );
      // When
      const saved = JSON.stringify(connected);
      const loaded = parseDocument(JSON.parse(saved));
      // Then
      expect(projectGraph(loaded).edges[0]).toMatchObject({
        source: "a",
        target: "b",
        sourceHandle: NODE_HANDLES[sourceSide],
        targetHandle: NODE_HANDLES[targetSide],
      });
    },
  );

  it("uses the same point for incoming and outgoing connections without reversing an existing wire", () => {
    // Given
    const incoming = connectNodes(
      fixture,
      { source: "a", target: "b", sourceHandle: "out", targetHandle: "out" },
      null,
    );
    // When
    const doc = connectNodes(
      incoming,
      { source: "b", target: "c", sourceHandle: "out", targetHandle: "in-top" },
      null,
    );
    // Then
    expect(
      projectGraph(doc).edges.map((edge) => [
        edge.source,
        edge.target,
        edge.sourceHandle,
        edge.targetHandle,
      ]),
    ).toEqual([
      ["a", "b", "out", "out"],
      ["b", "c", "out", "in-top"],
    ]);
  });

  it("keeps copied and pasted reverse-side connections", () => {
    // Given
    const original = connectNodes(
      fixture,
      { source: "a", target: "b", sourceHandle: "in-top", targetHandle: "out-bottom" },
      null,
    );
    const copied = copySelection(original, ["a", "b"]);
    // When
    const result = pasteSelection(original, copied, { parent: null, position: { x: 0, y: 400 } });
    // Then
    expect(projectGraph(result.doc).edges.at(-1)).toMatchObject({
      sourceHandle: "in-top",
      targetHandle: "out-bottom",
    });
    expect(result.doc.edges.at(-1)?.source).not.toBe("a");
  });

  it("can receive at an exposed output point and then start there without moving either connection", () => {
    // Given
    const outgoing = connectNodes(
      fixture,
      { source: "a", target: "b", sourceHandle: "out", targetHandle: "in" },
      null,
    );
    const converted = convertToSubgraph(outgoing, ["a"]);
    const group = converted.nodes.find((n) => n.subgraph);
    const port = group && endpointPorts(group)[0];
    if (!group || !port) throw new DocumentError("Missing exposed endpoint");
    const incoming = connectNodes(
      converted,
      { source: "c", target: group.id, sourceHandle: "in", targetHandle: port.id },
      null,
    );
    // When
    const doc = connectNodes(
      incoming,
      { source: group.id, target: "c", sourceHandle: port.id, targetHandle: "out-bottom" },
      null,
    );
    // Then
    const updated = doc.nodes.find((n) => n.id === group.id);
    if (!updated) throw new DocumentError("Missing updated subgraph");
    expect(endpointPorts(updated)).toHaveLength(1);
    expect(projectGraph(doc).edges.map((e) => [e.sourceHandle, e.targetHandle])).toEqual([
      ["out", "in"],
      ["in", "out"],
      ["out", "out-bottom"],
    ]);
    expect(scopeGraph(doc, updated).edges.map((e) => [e.source, e.target])).toEqual([
      ["a", boundaryId(doc, group.id, "output")],
      [boundaryId(doc, group.id, "input"), "a"],
      ["a", boundaryId(doc, group.id, "output")],
    ]);
    expect(ungroup(doc, group.id).edges.map((e) => [e.source, e.target])).toEqual([
      ["a", "b"],
      ["c", "a"],
      ["a", "c"],
    ]);
  });

  it("keeps all four subgraph points distinct even with conflicting imported IDs", () => {
    // Given
    const group = {
      ...newNode({ x: 0, y: 0 }),
      ports: [
        { id: "x", nodeId: "a", label: "a", direction: "output" as const },
        { id: "side:left:x", nodeId: "b", label: "b", direction: "output" as const },
        { id: "vertical:x", nodeId: "c", label: "c", direction: "input" as const },
      ],
    };
    // When
    const handles = group.ports.flatMap((port) =>
      CONNECTION_SIDES.map((side) => portHandle(group, port, side)),
    );
    // Then
    expect(new Set(handles).size).toBe(12);
  });
});
