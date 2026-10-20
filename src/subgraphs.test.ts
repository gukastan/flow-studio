import { describe, expect, it } from "vitest";
import { connectNodes } from "./connections";
import { convertToSubgraph, moveItems, projectGraph, ungroup } from "./graph";
import { DocumentError, parseDocument } from "./model";
import { starter } from "./sample";
import { boundaryId, scopeDocument, scopeGraph } from "./scopeGraph";
import { editPort, exposePort, reconcileSubgraphs, removePort } from "./subgraphPorts";

function converted() {
  return convertToSubgraph(starter, ["g"]);
}
function inputPort() {
  const doc = converted();
  const port = doc.nodes.find((n) => n.id === "g")?.ports?.find((p) => p.direction === "input");
  if (!port) throw new DocumentError("Fixture requires an input slot");
  return { doc, port };
}
describe("subgraph editing", () => {
  it("shows only inner nodes plus input/output boundaries when entering a subgraph", () => {
    // Given
    const doc = converted();
    const group = doc.nodes.find((n) => n.id === "g");
    if (!group) throw new DocumentError("Fixture requires a group");
    // When
    const graph = scopeGraph(doc, group);
    // Then
    expect(graph.nodes.map((n) => n.id)).toEqual([
      "b",
      "c",
      boundaryId(doc, "g", "input"),
      boundaryId(doc, "g", "output"),
    ]);
    expect(graph.edges).toHaveLength(4);
    expect(graph.boundaries.size).toBe(2);
    expect(scopeDocument(doc, "g").nodes.map((n) => [n.id, n.parent])).toEqual([
      ["b", null],
      ["c", null],
    ]);
  });
  it("keeps nested subgraph contents out of the parent view", () => {
    // Given
    const doc = convertToSubgraph(converted(), ["b"]);
    // When
    const view = scopeDocument(doc, "g");
    // Then
    expect(view.nodes.some((n) => n.id === "b")).toBe(false);
    expect(view.nodes.some((n) => n.subgraph)).toBe(true);
    expect(projectGraph(doc, "g").nodes.some((n) => n.id === "b")).toBe(false);
  });
  it("hides a self-loop inside a subgraph but shows it in the inner view", () => {
    // Given
    const doc = convertToSubgraph(
      {
        ...starter,
        edges: [
          ...starter.edges,
          { id: "loop", source: "b", target: "b", label: "", dashed: false, arrow: true },
        ],
      },
      ["g"],
    );
    // When
    const parent = projectGraph(doc);
    const inner = projectGraph(doc, "g");
    // Then
    expect(parent.edges.some((e) => e.id === "loop")).toBe(false);
    expect(inner.edges.some((e) => e.id === "loop")).toBe(true);
  });
  it("preserves all original wires when unpacking a subgraph", () => {
    // Given
    const doc = converted();
    // When
    const unpacked = ungroup(doc, "g");
    // Then
    expect(unpacked.nodes.map((n) => n.id)).toEqual(["a", "b", "c", "d"]);
    expect(unpacked.nodes.every((n) => n.parent === null)).toBe(true);
    expect(unpacked.edges).toEqual(starter.edges);
    expect(parseDocument(unpacked)).toEqual(unpacked);
  });
  it("keeps the outer card stationary when editing inner node positions", () => {
    // Given
    const doc = converted();
    const original = doc.nodes.find((n) => n.id === "g")?.position;
    // When
    const moved = moveItems(doc, new Map([["b", { x: 1200, y: 800 }]]));
    // Then
    expect(moved.nodes.find((n) => n.id === "g")?.position).toEqual(original);
    expect(moved.nodes.find((n) => n.id === "b")?.position).toEqual({ x: 1200, y: 800 });
  });
});
describe("subgraph slots", () => {
  it("reconnects an exposed input without changing internal wires", () => {
    // Given
    const { doc, port } = inputPort();
    // When
    const changed = editPort(doc, "g", { id: port.id, nodeId: "c", label: "검토 입력" });
    // Then
    expect(changed.edges.find((e) => e.source === "a")?.target).toBe("c");
    expect(changed.edges.filter((e) => e.source !== "a")).toEqual(
      doc.edges.filter((e) => e.source !== "a"),
    );
    expect(
      changed.nodes.find((n) => n.id === "g")?.ports?.find((p) => p.id === port.id),
    ).toMatchObject({ nodeId: "c", label: "검토 입력" });
  });
  it("removes only dependent external wires when deleting a slot", () => {
    // Given
    const { doc, port } = inputPort();
    // When
    const changed = removePort(doc, "g", port.id);
    // Then
    expect(changed.edges).toEqual(doc.edges.filter((e) => e.source !== "a"));
    expect(changed.nodes.find((n) => n.id === "g")?.ports?.some((p) => p.id === port.id)).toBe(
      false,
    );
  });
  it("maps a new external connection through the selected subgraph slot", () => {
    // Given
    const { doc, port } = inputPort();
    // When
    const changed = connectNodes(
      doc,
      { source: "d", sourceHandle: "out", target: "g", targetHandle: port.id },
      null,
    );
    // Then
    expect(changed.edges.at(-1)).toMatchObject({ source: "d", target: "b" });
    expect(parseDocument(changed)).toEqual(changed);
  });
  it("rejects manual wiring from the read-only input boundary", () => {
    // Given
    const doc = converted();
    // When
    const connectBoundary = () =>
      connectNodes(
        doc,
        {
          source: boundaryId(doc, "g", "input"),
          sourceHandle: "new",
          target: "c",
          targetHandle: "in",
        },
        "g",
      );
    // Then
    expect(connectBoundary).toThrow(DocumentError);
  });
  it("rejects exposing nodes outside a subgraph", () => {
    // Given
    const doc = converted();
    // When
    const changed = exposePort(doc, "g", { nodeId: "a", direction: "input" });
    // Then
    expect(changed).toBe(doc);
  });
  it("exposes a nested endpoint even before an external wire exists", () => {
    // Given
    const doc = convertToSubgraph(convertToSubgraph({ ...starter, edges: [] }, ["g"]), ["c"]);
    const inner = doc.nodes.find((n) => n.subgraph && n.parent === "g");
    if (!inner) throw new DocumentError("Fixture requires a nested subgraph");
    // When
    const changed = exposePort(doc, "g", { nodeId: "c", direction: "input" });
    // Then
    const innerPort = changed.nodes.find((n) => n.id === inner.id)?.ports?.[0];
    expect(innerPort).toMatchObject({ nodeId: "c", direction: "input" });
    const outer = changed.nodes.find((n) => n.id === "g");
    if (!outer) throw new DocumentError("Fixture requires an outer subgraph");
    expect(scopeGraph(changed, outer).edges).toHaveLength(0);
    expect(changed.edges).toHaveLength(0);
    expect(parseDocument(changed)).toEqual(changed);
  });
  it("removes dependent ancestor slots when deleting a nested input", () => {
    // Given
    const doc = convertToSubgraph(convertToSubgraph({ ...starter, edges: [] }, ["g"]), ["c"]);
    const exposed = exposePort(doc, "g", { nodeId: "c", direction: "input" });
    const inner = exposed.nodes.find((n) => n.subgraph && n.parent === "g");
    const port = inner?.ports?.[0];
    if (!inner || !port) throw new DocumentError("Fixture requires a nested input");
    // When
    const changed = reconcileSubgraphs(removePort(exposed, inner.id, port.id));
    // Then
    expect(
      changed.nodes
        .filter((n) => n.subgraph)
        .every((n) => !n.ports?.some((p) => p.nodeId === "c" && p.direction === "input")),
    ).toBe(true);
    expect(changed.nodes.map((n) => n.id)).toEqual(exposed.nodes.map((n) => n.id));
  });
  it("rejects files whose exposed slots point outside their subgraph", () => {
    // Given
    const { doc, port } = inputPort();
    const invalid = {
      ...doc,
      nodes: doc.nodes.map((n) => (n.id === "g" ? { ...n, ports: [{ ...port, nodeId: "a" }] } : n)),
    };
    // When / Then
    expect(() => parseDocument(invalid)).toThrow(DocumentError);
  });
});
