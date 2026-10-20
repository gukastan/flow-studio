import { moveItems, selectionRoots } from "./graph";
import type { Document, Point } from "./model";
import { isSubgraph } from "./model";

export type Alignment = "horizontal" | "vertical";
export function canAlign(doc: Document, ids: readonly string[]): boolean {
  const roots = selectionRoots(doc, ids);
  return roots.length > 1 && roots.every((node) => node.parent === roots[0]?.parent);
}

export function alignSelection(
  doc: Document,
  ids: readonly string[],
  direction: Alignment,
): Document {
  if (!canAlign(doc, ids)) return doc;
  const horizontal = direction === "horizontal";
  const roots = selectionRoots(doc, ids)
    .map((node) => ({
      ...node,
      width: node.collapsed && !isSubgraph(node) ? 224 : node.width,
      height: node.collapsed && !isSubgraph(node) ? 88 : node.height,
    }))
    .sort((a, b) =>
      horizontal
        ? a.position.x - b.position.x || a.position.y - b.position.y
        : a.position.y - b.position.y || a.position.x - b.position.x,
    );
  const left = Math.min(...roots.map((n) => n.position.x));
  const top = Math.min(...roots.map((n) => n.position.y));
  const right = Math.max(...roots.map((n) => n.position.x + n.width));
  const bottom = Math.max(...roots.map((n) => n.position.y + n.height));
  const moves = new Map<string, Point>();
  let cursor = horizontal ? left : top;
  for (const node of roots) {
    moves.set(
      node.id,
      horizontal
        ? { x: cursor, y: (top + bottom - node.height) / 2 }
        : { x: (left + right - node.width) / 2, y: cursor },
    );
    cursor += (horizontal ? node.width : node.height) + 64;
  }
  return moveItems(doc, moves);
}
