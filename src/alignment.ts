import { moveItems, selectionRoots } from "./graph";
import type { Document, Point } from "./model";
import { isSubgraph } from "./model";

export type Alignment = "horizontal" | "vertical";
export function canAlign(doc: Document, ids: readonly string[]): boolean {
  const roots = selectionRoots(doc, ids);
  return roots.length > 1 && roots.every((node) => node.parent === roots[0]?.parent);
}

export function canDistribute(doc: Document, ids: readonly string[]): boolean {
  return selectionRoots(doc, ids).length > 2 && canAlign(doc, ids);
}

function visibleRoots(doc: Document, ids: readonly string[]) {
  return selectionRoots(doc, ids).map((node) => ({
    ...node,
    width: node.collapsed && !isSubgraph(node) ? 224 : node.width,
    height: node.collapsed && !isSubgraph(node) ? 88 : node.height,
  }));
}

export function alignSelection(
  doc: Document,
  ids: readonly string[],
  direction: Alignment,
): Document {
  if (!canAlign(doc, ids)) return doc;
  const horizontal = direction === "horizontal";
  const roots = visibleRoots(doc, ids);
  const left = Math.min(...roots.map((n) => n.position.x));
  const top = Math.min(...roots.map((n) => n.position.y));
  const right = Math.max(...roots.map((n) => n.position.x + n.width));
  const bottom = Math.max(...roots.map((n) => n.position.y + n.height));
  const moves = new Map<string, Point>();
  for (const node of roots) {
    moves.set(
      node.id,
      horizontal
        ? { x: node.position.x, y: (top + bottom - node.height) / 2 }
        : { x: (left + right - node.width) / 2, y: node.position.y },
    );
  }
  return moveItems(doc, moves);
}

export function distributeSelection(
  doc: Document,
  ids: readonly string[],
  direction: Alignment,
): Document {
  if (!canDistribute(doc, ids)) return doc;
  const axis = direction === "horizontal" ? "x" : "y";
  const size = direction === "horizontal" ? "width" : "height";
  const roots = visibleRoots(doc, ids).sort((a, b) => a.position[axis] - b.position[axis]);
  const first = roots[0];
  const last = roots.at(-1);
  if (!first || !last) return doc;
  const occupied = roots.slice(0, -1).reduce((sum, node) => sum + node[size], 0);
  const gap = (last.position[axis] - first.position[axis] - occupied) / (roots.length - 1);
  const moves = new Map<string, Point>();
  let cursor = first.position[axis] + first[size] + gap;
  for (const node of roots.slice(1, -1)) {
    moves.set(node.id, { ...node.position, [axis]: cursor });
    cursor += node[size] + gap;
  }
  return moveItems(doc, moves);
}
