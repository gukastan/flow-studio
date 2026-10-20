import { describe, expect, it } from "vitest";
import { copySelection, pasteSelection, readSelection, serializeSelection } from "./clipboard";
import { verticalPortHandle } from "./connectionHandles";
import { connectNodes } from "./connections";
import { convertToSubgraph, projectGraph, ungroup } from "./graph";
import { DocumentError, emptyDocument, newNode, parseDocument } from "./model";
import { boundaryId, scopeGraph } from "./scopeGraph";

const fixture = {
  ...emptyDocument,
  nodes: ["a", "b", "c"].map((id, index) => ({
    ...newNode({ x: 0, y: index * 220 }),
    id,
    label: id,
  })),
};

function connect(sourceHandle: string, targetHandle: string) {
  return connectNodes(fixture, { source: "a", sourceHandle, target: "b", targetHandle }, null);
}

describe("top and bottom connection points", () => {
  it.each([
    ["out", "in"],
    ["out", "in-top"],
    ["out-bottom", "in"],
    ["out-bottom", "in-top"],
  ])("keeps %s → %s through file save and load", (sourceHandle, targetHandle) => {
    const doc = parseDocument(JSON.parse(JSON.stringify(connect(sourceHandle, targetHandle))));
    expect(projectGraph(doc).edges[0]).toMatchObject({
      source: "a",
      target: "b",
      sourceHandle,
      targetHandle,
    });
  });

  it("keeps legacy edges on the original left and right points", () => {
    const doc = connect("out", "in");
    expect(doc.edges[0]).not.toHaveProperty("sourceSide");
    expect(doc.edges[0]).not.toHaveProperty("targetSide");
    expect(projectGraph(parseDocument(doc)).edges[0]).toMatchObject({
      sourceHandle: "out",
      targetHandle: "in",
    });
  });

  it("preserves sides when copying and pasting both connected nodes", () => {
    const doc = connect("out-bottom", "in-top");
    const selection = readSelection(serializeSelection(copySelection(doc, ["a", "b"])));
    const pasted = pasteSelection(doc, selection, {
      parent: null,
      position: { x: 400, y: 0 },
    }).doc;
    expect(projectGraph(pasted).edges.at(-1)).toMatchObject({
      sourceHandle: "out-bottom",
      targetHandle: "in-top",
    });
    expect(pasted.edges.at(-1)?.source).not.toBe("a");
    expect(pasted.edges.at(-1)?.target).not.toBe("b");
  });

  it("preserves both ends through nested subgraphs, inner views and unpacking", () => {
    const original = connect("out-bottom", "in-top");
    const innerDoc = convertToSubgraph(original, ["a"]);
    const inner = innerDoc.nodes.find((n) => n.subgraph);
    if (!inner) throw new DocumentError("Missing inner fixture");
    const outerDoc = convertToSubgraph(innerDoc, [inner.id, "c"]);
    const outer = outerDoc.nodes.find((n) => n.subgraph && n.id !== inner.id);
    if (!outer) throw new DocumentError("Missing outer fixture");
    const outerPort = outer.ports?.find((p) => p.nodeId === "a");
    const innerPort = inner.ports?.find((p) => p.nodeId === "a");
    if (!outerPort || !innerPort) throw new DocumentError("Missing port fixture");
    expect(projectGraph(outerDoc).edges[0]).toMatchObject({
      source: outer.id,
      sourceHandle: verticalPortHandle(outer, outerPort.id),
      targetHandle: "in-top",
    });
    expect(scopeGraph(outerDoc, outer).edges[0]).toMatchObject({
      source: inner.id,
      sourceHandle: verticalPortHandle(inner, innerPort.id),
      target: boundaryId(outerDoc, outer.id, "output"),
    });
    expect(scopeGraph(outerDoc, inner).edges[0]).toMatchObject({
      source: "a",
      sourceHandle: "out-bottom",
    });
    const unpacked = ungroup(ungroup(outerDoc, outer.id), inner.id);
    expect(unpacked.edges).toEqual(original.edges);
  });

  it("reflects a new connection between vertical subgraph slots in both interiors", () => {
    const converted = convertToSubgraph(convertToSubgraph(connect("out", "in"), ["a"]), ["b"]);
    const source = converted.nodes.find((n) => n.subgraph && n.label === "a");
    const target = converted.nodes.find((n) => n.subgraph && n.label === "b");
    const output = source?.ports?.find((p) => p.direction === "output");
    const input = target?.ports?.find((p) => p.direction === "input");
    if (!source || !target || !output || !input) throw new DocumentError("Missing slot fixtures");
    const doc = connectNodes(
      { ...converted, edges: [] },
      {
        source: source.id,
        sourceHandle: verticalPortHandle(source, output.id),
        target: target.id,
        targetHandle: verticalPortHandle(target, input.id),
      },
      null,
    );
    expect(doc.edges[0]).toMatchObject({
      source: "a",
      target: "b",
      sourceSide: "bottom",
      targetSide: "top",
    });
    expect(scopeGraph(doc, source).edges[0]?.sourceHandle).toBe("out-bottom");
    expect(scopeGraph(doc, target).edges[0]?.targetHandle).toBe("in-top");
  });

  it("does not confuse an imported port ID with a vertical handle alias", () => {
    const doc = convertToSubgraph(connect("out", "in"), ["a", "c"]);
    const group = doc.nodes.find((n) => n.subgraph);
    if (!group) throw new DocumentError("Missing fixture");
    const changed = {
      ...group,
      ports: [
        { id: "port", nodeId: "a", direction: "output" as const, label: "a" },
        { id: "vertical:port", nodeId: "c", direction: "output" as const, label: "c" },
      ],
    };
    expect(verticalPortHandle(changed, "port")).not.toBe("vertical:port");
    const connected = connectNodes(
      { ...doc, nodes: doc.nodes.map((n) => (n.id === group.id ? changed : n)), edges: [] },
      {
        source: group.id,
        sourceHandle: verticalPortHandle(changed, "port"),
        target: "b",
        targetHandle: "in-top",
      },
      null,
    );
    expect(connected.edges[0]).toMatchObject({ source: "a", sourceSide: "bottom" });
    const horizontal = connectNodes(
      { ...doc, nodes: doc.nodes.map((n) => (n.id === group.id ? changed : n)), edges: [] },
      {
        source: group.id,
        sourceHandle: "vertical:port",
        target: "b",
        targetHandle: "in",
      },
      null,
    );
    expect(horizontal.edges[0]?.source).toBe("c");
    expect(horizontal.edges[0]).not.toHaveProperty("sourceSide");
  });

  it("rejects invalid persisted sides and incompatible handles", () => {
    const doc = connect("out-bottom", "in-top");
    expect(() =>
      parseDocument({
        ...doc,
        edges: doc.edges.map((e) => ({ ...e, targetSide: "bottom" })),
      }),
    ).toThrow(DocumentError);
    expect(() => connect("in-top", "in")).toThrow(DocumentError);
    expect(() => connect("out", "out-bottom")).toThrow(DocumentError);
  });
});
