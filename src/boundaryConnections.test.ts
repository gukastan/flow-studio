import { describe, expect, it } from "vitest";
import { connectNodes } from "./connections";
import { convertToSubgraph } from "./graph";
import { DocumentError } from "./model";
import { starter } from "./sample";
import { boundaryId, scopeGraph } from "./scopeGraph";

describe("external connections inside a subgraph", () => {
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
