import type { Document, Item, Point } from "./model";
import { isSubgraph, newNode } from "./model";
import { scopeGraph } from "./scopeGraph";

const gap = 24;
function overlaps(point: Point, node: Item): boolean {
  const folded = node.collapsed && !isSubgraph(node);
  return (
    point.x < node.position.x + (folded ? 224 : node.width) + gap &&
    point.x + 224 + gap > node.position.x &&
    point.y < node.position.y + (folded ? 88 : node.height) + gap &&
    point.y + 88 + gap > node.position.y
  );
}

export function createPlacedNode(doc: Document, parent: string | null, at: Point): Item {
  const scope = doc.nodes.find((n) => n.id === parent) ?? null;
  const occupied = scopeGraph(doc, scope).nodes;
  const vacant = (point: Point) => occupied.every((n) => !overlaps(point, n));
  let position = at;
  if (!vacant(position)) {
    let found: Point | undefined;
    for (let radius = 1; radius <= 12 && !found; radius++) {
      const candidates: Point[] = [];
      for (let x = -radius; x <= radius; x++)
        for (let y = -radius; y <= radius; y++)
          if (Math.max(Math.abs(x), Math.abs(y)) === radius)
            candidates.push({ x: at.x + x * 248, y: at.y + y * 112 });
      candidates.sort(
        (a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y),
      );
      found = candidates.find(vacant);
    }
    position = found ?? {
      x: Math.max(...occupied.map((n) => n.position.x + n.width)) + gap,
      y: at.y,
    };
  }
  return { ...newNode(position), parent };
}
