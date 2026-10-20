import { describe, expect, it } from "vitest";
import { convertToSubgraph } from "./graph";
import { emptyDocument, newNode } from "./model";
import { createPlacedNode } from "./placement";

describe("node placement", () => {
  it("keeps a gap between every node added from the same point", () => {
    // Given
    let doc = emptyDocument;
    // When
    for (let i = 0; i < 12; i++) {
      const node = createPlacedNode(doc, null, { x: 200, y: 200 });
      doc = { ...doc, nodes: [...doc.nodes, node] };
    }
    // Then
    for (const [i, a] of doc.nodes.entries())
      for (const b of doc.nodes.slice(i + 1))
        expect(
          Math.abs(a.position.x - b.position.x) >= 248 ||
            Math.abs(a.position.y - b.position.y) >= 112,
        ).toBe(true);
  });
  it("uses the active subgraph and avoids its existing nodes", () => {
    // Given
    const existing = newNode({ x: 200, y: 200 });
    const doc = convertToSubgraph({ ...emptyDocument, nodes: [existing] }, [existing.id]);
    const group = doc.nodes.find((n) => n.subgraph);
    // When
    const added = createPlacedNode(doc, group?.id ?? null, existing.position);
    // Then
    expect(added.parent).toBe(group?.id);
    expect(
      Math.abs(added.position.x - existing.position.x) >= 248 ||
        Math.abs(added.position.y - existing.position.y) >= 112,
    ).toBe(true);
  });
});
