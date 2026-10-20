import { describe, expect, it } from "vitest";
import { convertToSubgraph, groupSelection, projectGraph } from "./graph";
import { DocumentError, parseDocument } from "./model";
import { starter } from "./sample";

describe("grouping toggle", () => {
  it("ungroups the selected group instead of nesting it on a second grouping action", () => {
    // Given
    const grouped = groupSelection(starter, ["a", "g"]);
    const created = grouped.nodes.find((n) => !starter.nodes.some((old) => old.id === n.id));
    if (!created) throw new DocumentError("Expected a group in the fixture");
    // When
    const result = groupSelection(grouped, [created.id]);
    // Then
    expect(result.nodes.map((n) => n.id)).toEqual(starter.nodes.map((n) => n.id));
    expect(result.nodes.find((n) => n.id === "g")?.parent).toBeNull();
    expect(result.nodes.find((n) => n.id === "b")?.parent).toBe("g");
    expect(result.edges).toEqual(starter.edges);
  });
  it("ungroups a root group even when its descendants are also selected", () => {
    // Given
    const ids = ["g", "b", "c"];
    // When
    const result = groupSelection(starter, ids);
    // Then
    expect(result.nodes.map((n) => n.id)).toEqual(["a", "b", "c", "d"]);
    expect(result.nodes.every((n) => n.parent === null)).toBe(true);
    expect(result.edges).toEqual(starter.edges);
  });
  it("leaves unrelated parents unchanged when grouping their children", () => {
    // Given
    const ids = ["a", "b"];
    // When
    const result = groupSelection(starter, ids);
    // Then
    expect(result).toBe(starter);
  });
});

describe("subgraph conversion", () => {
  it("converts an existing group into a compact subgraph without changing its identity", () => {
    // Given
    const original = starter.nodes.find((n) => n.id === "g");
    // When
    const result = convertToSubgraph(starter, ["g"]);
    // Then
    expect(result.nodes).toHaveLength(starter.nodes.length);
    expect(result.nodes.find((n) => n.id === "g")).toMatchObject({
      id: original?.id,
      label: original?.label,
      color: original?.color,
      collapsed: true,
      subgraph: true,
      width: 224,
    });
    expect(result.nodes.find((n) => n.id === "g")?.ports).toEqual([
      expect.objectContaining({ direction: "input", nodeId: "b" }),
      expect.objectContaining({ direction: "output", nodeId: "c" }),
    ]);
    expect(result.edges).toEqual(starter.edges);
    expect(projectGraph(result).nodes.map((n) => n.id)).toEqual(["a", "g", "d"]);
  });
  it("retains internal links and projects external links after converting siblings", () => {
    // Given
    const ids = ["b", "c"];
    // When
    const result = convertToSubgraph(starter, ids);
    // Then
    const created = result.nodes.find((n) => !starter.nodes.some((old) => old.id === n.id));
    expect(created).toMatchObject({ kind: "group", parent: "g", collapsed: true });
    expect(result.nodes.filter((n) => ids.includes(n.id)).map((n) => n.parent)).toEqual([
      created?.id,
      created?.id,
    ]);
    expect(result.edges).toEqual(starter.edges);
    expect(projectGraph(result).edges.map((e) => [e.source, e.target])).toEqual([
      ["a", created?.id],
      [created?.id, "d"],
    ]);
  });
  it("preserves a converted subgraph through file save and load", () => {
    // Given
    const converted = convertToSubgraph(starter, ["a"]);
    // When
    const reopened = parseDocument(JSON.parse(JSON.stringify(converted)));
    // Then
    expect(reopened).toEqual(converted);
    expect(reopened.nodes.find((n) => n.id === "a")?.parent).toBeTruthy();
    expect(reopened.edges).toEqual(starter.edges);
  });
  it("does nothing when an already collapsed subgraph is converted again", () => {
    // Given
    const converted = convertToSubgraph(starter, ["g"]);
    // When
    const result = convertToSubgraph(converted, ["g"]);
    // Then
    expect(result).toBe(converted);
  });
  it("does not alter selections crossing group boundaries", () => {
    // Given
    const ids = ["a", "b"];
    // When
    const result = convertToSubgraph(starter, ids);
    // Then
    expect(result).toBe(starter);
  });
});
