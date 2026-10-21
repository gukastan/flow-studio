import { describe, expect, it } from "vitest";
import { connectNodes } from "./connections";
import { convertToSubgraph, moveItems } from "./graph";
import { DocumentError, parseDocument } from "./model";
import { starter } from "./sample";
import { boundaryId, scopeGraph } from "./scopeGraph";

describe("external connections inside a subgraph", () => {
  it("uses connected outer node names and leaves disconnected boundary names empty", () => {
    const doc = convertToSubgraph(starter, ["g"]);
    const group = doc.nodes.find((node) => node.id === "g");
    if (!group) throw new DocumentError("Missing fixture subgraph");
    const boundary = (current: typeof doc, direction: "input" | "output") =>
      scopeGraph(current, group).nodes.find(
        (node) => node.id === boundaryId(current, "g", direction),
      );
    expect(boundary(doc, "input")?.label).toBe("아이디어 수집");
    expect(boundary(doc, "output")?.label).toBe("결과 완성");

    const renamed = {
      ...doc,
      nodes: doc.nodes.map((node) => (node.id === "a" ? { ...node, label: "새 출발" } : node)),
    };
    expect(boundary(renamed, "input")?.label).toBe("새 출발");
    const disconnected = { ...doc, edges: doc.edges.filter((edge) => edge.source !== "a") };
    expect(boundary(disconnected, "input")?.label).toBe("");
    expect(boundary(disconnected, "output")?.label).toBe("결과 완성");
  });
  it("converges multiple real wires onto one boundary handle per direction", () => {
    const parallel = {
      ...starter,
      edges: [
        ...starter.edges,
        { id: "ac", source: "a", target: "c", label: "", dashed: false, arrow: true },
        { id: "bd", source: "b", target: "d", label: "", dashed: false, arrow: true },
      ],
    };
    const doc = convertToSubgraph(parallel, ["g"]);
    const group = doc.nodes.find((node) => node.id === "g");
    if (!group) throw new DocumentError("Missing fixture subgraph");
    expect(group.ports?.filter((port) => port.direction === "input")).toHaveLength(2);
    expect(group.ports?.filter((port) => port.direction === "output")).toHaveLength(2);
    const inner = scopeGraph(doc, group);
    expect(
      inner.edges
        .filter((edge) => edge.source === boundaryId(doc, "g", "input"))
        .map((edge) => edge.sourceHandle),
    ).toEqual(["out", "out"]);
    expect(
      inner.edges
        .filter((edge) => edge.target === boundaryId(doc, "g", "output"))
        .map((edge) => edge.targetHandle),
    ).toEqual(["in", "in"]);
    expect(parseDocument(doc).edges).toEqual(parallel.edges);
  });
  it("keeps 160px of room and vertically centers boundary cards beside the inner nodes", () => {
    const doc = convertToSubgraph(starter, ["g"]);
    const group = doc.nodes.find((n) => n.id === "g");
    if (!group) throw new DocumentError("Missing fixture subgraph");
    for (const current of [
      doc,
      moveItems(
        doc,
        new Map([
          ["b", { x: -600, y: 400 }],
          ["c", { x: 1600, y: 500 }],
        ]),
      ),
    ]) {
      const view = scopeGraph(current, group);
      const input = view.nodes.find((n) => view.boundaries.get(n.id) === "input");
      const output = view.nodes.find((n) => view.boundaries.get(n.id) === "output");
      const inner = view.nodes.filter((n) => !view.boundaries.has(n.id));
      if (!input || !output) throw new DocumentError("Missing fixture boundaries");
      const left = Math.min(...inner.map((n) => n.position.x));
      const right = Math.max(...inner.map((n) => n.position.x + n.width));
      const top = Math.min(...inner.map((n) => n.position.y));
      const bottom = Math.max(...inner.map((n) => n.position.y + n.height));
      expect(left - input.position.x - input.width).toBe(160);
      expect(output.position.x - right).toBe(160);
      expect(input.position.y + input.height / 2).toBe((top + bottom) / 2);
      expect(output.position.y + output.height / 2).toBe((top + bottom) / 2);
      expect(inner).toEqual(current.nodes.filter((n) => n.parent === group.id));
      expect(view.edges.map((e) => e.id).sort()).toEqual(current.edges.map((e) => e.id).sort());
    }
  });
  it("projects each external connection with its original ID and appearance", () => {
    // Given
    const doc = convertToSubgraph(starter, ["g"]);
    const group = doc.nodes.find((n) => n.id === "g");
    const original = doc.edges.find((e) => e.source === "c" && e.target === "d");
    if (!group || !original) throw new DocumentError("Missing fixture connection");
    // When
    const view = scopeGraph(doc, group);
    // Then
    expect(view.edges.find((e) => e.id === original.id)).toMatchObject({
      source: "c",
      target: boundaryId(doc, "g", "output"),
      label: original.label,
      dashed: original.dashed,
    });
  });
  it("removes the inner segment when its external connection is deleted", () => {
    // Given
    const doc = convertToSubgraph(starter, ["g"]);
    const group = doc.nodes.find((n) => n.id === "g");
    if (!group) throw new DocumentError("Missing fixture subgraph");
    const disconnected = { ...doc, edges: doc.edges.filter((e) => e.target !== "d") };
    // When
    const view = scopeGraph(disconnected, group);
    // Then
    expect(view.edges.some((e) => e.target === boundaryId(doc, "g", "output"))).toBe(false);
    expect(
      view.edges.filter((e) => ["b", "c"].includes(e.source) && ["b", "c"].includes(e.target)),
    ).toHaveLength(2);
  });
  it("reflects an external connection added to a previously unconnected output", () => {
    // Given
    const original = convertToSubgraph(starter, ["g"]);
    const doc = { ...original, edges: original.edges.filter((e) => e.target !== "d") };
    const group = doc.nodes.find((n) => n.id === "g");
    const port = group?.ports?.find((p) => p.direction === "output");
    if (!group || !port) throw new DocumentError("Missing fixture output");
    // When
    const changed = connectNodes(
      doc,
      { source: "g", sourceHandle: port.id, target: "d", targetHandle: "in" },
      null,
    );
    // Then
    const edge = changed.edges.at(-1);
    expect(
      scopeGraph(changed, changed.nodes.find((n) => n.id === "g") ?? null).edges.find(
        (e) => e.id === edge?.id,
      ),
    ).toMatchObject({ source: "c", target: boundaryId(doc, "g", "output") });
  });
  it("does not invent ports when the selection has no boundary connections", () => {
    // Given
    const doc = { ...starter, edges: [] };
    // When
    const converted = convertToSubgraph(doc, ["g"]);
    // Then
    const ports = converted.nodes.find((n) => n.id === "g")?.ports ?? [];
    expect(ports).toEqual([]);
    expect(
      scopeGraph(converted, converted.nodes.find((n) => n.id === "g") ?? null).edges,
    ).toHaveLength(0);
  });
});
