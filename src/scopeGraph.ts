import { endpointHandle } from "./connectionHandles";
import { projectGraph, visibleRepresentative } from "./graph";
import type { Document, Item, Port } from "./model";
import { ancestors, descendants, isSubgraph } from "./model";

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

export function scopeGraph(doc: Document, scope: Item | null) {
  const graph = projectGraph(doc, scope?.id ?? null);
  const boundaries = new Map<string, Port["direction"]>();
  if (!scope) return { ...graph, boundaries, slots: new Map<string, string>() };
  const left = (graph.nodes.length ? Math.min(...graph.nodes.map((n) => n.position.x)) : 0) - 320;
  const right =
    (graph.nodes.length ? Math.max(...graph.nodes.map((n) => n.position.x + n.width)) : 300) + 96;
  const top = graph.nodes.length ? Math.min(...graph.nodes.map((n) => n.position.y)) : 0;
  const nodes = [...graph.nodes];
  for (const direction of ["input", "output"] as const) {
    const id = boundaryId(doc, scope.id, direction);
    const ports = (scope.ports ?? []).filter((p) => p.direction === direction);
    boundaries.set(id, direction);
    nodes.push({
      ...scope,
      id,
      kind: "node",
      subgraph: false,
      collapsed: false,
      parent: null,
      ports,
      label: direction === "input" ? "서브그래프 입력" : "서브그래프 출력",
      width: 224,
      height: Math.max(116, 82 + ports.length * 28),
      position: { x: direction === "input" ? left : right, y: top },
    });
  }
  const slots = new Map<string, string>();
  const edges = [...graph.edges];
  const inside = descendants(doc, scope.id);
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
    slots.set(edge.id, port.id);
    edges.push({
      ...edge,
      source: input ? boundary : visible,
      target: input ? visible : boundary,
      sourceHandle: input
        ? port.id
        : endpointHandle(doc, {
            nodeId: endpoint,
            visibleId: visible,
            side: edge.sourceSide ?? "right",
          }),
      targetHandle: input
        ? endpointHandle(doc, {
            nodeId: endpoint,
            visibleId: visible,
            side: edge.targetSide ?? "left",
          })
        : port.id,
      projected: true,
    });
  }
  return { nodes, edges, boundaries, slots };
}
