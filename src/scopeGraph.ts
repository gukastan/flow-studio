import { NODE_HANDLES } from "./connectionHandles";
import { moveItems, projectGraph, visibleRepresentative } from "./graph";
import type { Document, Item, Point, Port } from "./model";
import { ancestors, descendants, isSubgraph } from "./model";

const BOUNDARY_WIDTH = 224;
const BOUNDARY_GAP = 320;

export function scopeDocument(doc: Document, scope: string | null): Document {
  const within = scope ? descendants(doc, scope) : new Set(doc.nodes.map((n) => n.id));
  const nodes = doc.nodes
    .filter((n) => {
      if (!within.has(n.id)) return false;
      const parents = ancestors(doc, n.id);
      const end = scope ? parents.indexOf(scope) : parents.length;
      return !parents.slice(0, end).some((id) => isSubgraph(doc.nodes.find((p) => p.id === id)));
    })
    .map((n) => ({ ...n, parent: n.parent === scope ? null : n.parent }));
  return { ...doc, nodes };
}

export function boundaryId(doc: Document, scope: string, direction: Port["direction"]): string {
  let id = `__boundary_${direction}_${scope}`;
  while (doc.nodes.some((n) => n.id === id)) id += "_";
  return id;
}

export function moveScopeItems(
  doc: Document,
  positions: ReadonlyMap<string, Point>,
  scopeId: string | null,
): Document {
  const moved = moveItems(doc, positions);
  const scope = moved.nodes.find((n) => n.id === scopeId);
  if (!scope || !isSubgraph(scope)) return moved;
  const offsets = { ...scope.boundaryOffsets };
  let changed = false;
  for (const direction of ["input", "output"] as const) {
    const position = positions.get(boundaryId(doc, scope.id, direction));
    if (!position) continue;
    offsets[direction] = {
      x: position.x - scope.position.x,
      y: position.y - scope.position.y,
    };
    changed = true;
  }
  return changed
    ? {
        ...moved,
        nodes: moved.nodes.map((n) => (n.id === scope.id ? { ...n, boundaryOffsets: offsets } : n)),
      }
    : moved;
}

export function scopeGraph(doc: Document, scope: Item | null) {
  const graph = projectGraph(doc, scope?.id ?? null);
  const boundaries = new Map<string, Port["direction"]>();
  if (!scope) return { ...graph, boundaries };
  const left =
    (graph.nodes.length ? Math.min(...graph.nodes.map((n) => n.position.x)) : 0) -
    BOUNDARY_WIDTH -
    BOUNDARY_GAP;
  const right =
    (graph.nodes.length ? Math.max(...graph.nodes.map((n) => n.position.x + n.width)) : 300) +
    BOUNDARY_GAP;
  const top = graph.nodes.length ? Math.min(...graph.nodes.map((n) => n.position.y)) : 0;
  const nodes = [...graph.nodes];
  const inside = descendants(doc, scope.id);
  for (const direction of ["input", "output"] as const) {
    const id = boundaryId(doc, scope.id, direction);
    const ports = (scope.ports ?? []).filter((p) => p.direction === direction);
    const offset = scope.boundaryOffsets?.[direction];
    const connectedNames = [
      ...new Set(
        doc.edges
          .filter((edge) =>
            direction === "input"
              ? !inside.has(edge.source) && inside.has(edge.target)
              : inside.has(edge.source) && !inside.has(edge.target),
          )
          .map((edge) => {
            const outside = direction === "input" ? edge.source : edge.target;
            const visible = visibleRepresentative(doc, outside, scope.parent);
            return doc.nodes.find((node) => node.id === visible)?.label ?? "";
          })
          .filter(Boolean),
      ),
    ];
    boundaries.set(id, direction);
    nodes.push({
      ...scope,
      id,
      kind: "node",
      subgraph: false,
      collapsed: false,
      parent: null,
      ports,
      label: connectedNames.join(" · "),
      width: BOUNDARY_WIDTH,
      height: 88,
      position: offset
        ? { x: scope.position.x + offset.x, y: scope.position.y + offset.y }
        : { x: direction === "input" ? left : right, y: top },
    });
  }
  const edges = [...graph.edges];
  for (const edge of doc.edges) {
    const input = !inside.has(edge.source) && inside.has(edge.target);
    const output = inside.has(edge.source) && !inside.has(edge.target);
    if (!input && !output) continue;
    const direction = input ? "input" : "output";
    const endpoint = input ? edge.target : edge.source;
    const port = scope.ports?.find((p) => p.direction === direction && p.nodeId === endpoint);
    if (!port) continue;
    const visible = visibleRepresentative(doc, endpoint, scope.id);
    const boundary = boundaryId(doc, scope.id, direction);
    edges.push({
      ...edge,
      source: input ? boundary : visible,
      target: input ? visible : boundary,
      sourceHandle: input ? NODE_HANDLES.right : NODE_HANDLES[edge.sourceSide ?? "right"],
      targetHandle: input ? NODE_HANDLES[edge.targetSide ?? "left"] : NODE_HANDLES.left,
      projected: true,
    });
  }
  return { nodes, edges, boundaries };
}
