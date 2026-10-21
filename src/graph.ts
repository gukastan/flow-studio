import { NODE_HANDLES } from "./connectionHandles";
import type { Document, Item, Point } from "./model";
import { ancestors, descendants, isSubgraph, newNode } from "./model";
import { reconcileSubgraphs } from "./subgraphPorts";

export function fitGroups(doc: Document): Document {
  let nodes = [...doc.nodes];
  const groups = nodes
    .filter((n) => n.kind === "group" && !isSubgraph(n))
    .sort((a, b) => ancestors(doc, b.id).length - ancestors(doc, a.id).length);
  for (const group of groups) {
    const children = nodes.filter((n) => n.parent === group.id);
    if (!children.length) continue;
    const x = Math.min(...children.map((n) => n.position.x)) - 32;
    const y = Math.min(...children.map((n) => n.position.y)) - 56;
    const right = Math.max(...children.map((n) => n.position.x + n.width)) + 32;
    const bottom = Math.max(...children.map((n) => n.position.y + n.height)) + 32;
    nodes = nodes.map((n) =>
      n.id === group.id ? { ...n, position: { x, y }, width: right - x, height: bottom - y } : n,
    );
  }
  return { ...doc, nodes };
}
export function selectionRoots(doc: Document, ids: readonly string[]): Item[] {
  return doc.nodes.filter(
    (n) => ids.includes(n.id) && !ancestors(doc, n.id).some((id) => ids.includes(id)),
  );
}
export function groupSelection(doc: Document, ids: readonly string[]): Document {
  const selected = selectionRoots(doc, ids);
  if (!selected.length) return doc;
  const single = selected.length === 1 ? selected[0] : undefined;
  if (single?.kind === "group") return isSubgraph(single) ? doc : ungroup(doc, single.id);
  if (doc.nodes.length >= 1000) return doc;
  const parent = selected[0]?.parent ?? null;
  if (selected.some((n) => n.parent !== parent)) return doc;
  const base = newNode({ x: 0, y: 0 });
  const group: Item = {
    ...base,
    id: `g_${crypto.randomUUID().slice(0, 8)}`,
    kind: "group",
    label: "새 그룹",
    color: "#a78bfa",
    parent,
  };
  return fitGroups({
    ...doc,
    nodes: [
      ...doc.nodes.map((n) =>
        selected.some((s) => s.id === n.id) ? { ...n, parent: group.id } : n,
      ),
      group,
    ],
  });
}
export function ungroup(doc: Document, id: string): Document {
  const group = doc.nodes.find((n) => n.id === id);
  if (group?.kind !== "group") return doc;
  return fitGroups({
    ...doc,
    nodes: doc.nodes
      .filter((n) => n.id !== id)
      .map((n) => (n.parent === id ? { ...n, parent: group.parent } : n)),
    edges: doc.edges.filter((e) => e.source !== id && e.target !== id),
  });
}
export function convertToSubgraph(doc: Document, ids: readonly string[]): Document {
  const roots = selectionRoots(doc, ids);
  const single = roots.length === 1 ? roots[0] : undefined;
  const existing = single?.kind === "group" ? single : undefined;
  const next = existing ? doc : groupSelection(doc, ids);
  const group = existing ?? next.nodes.find((n) => !doc.nodes.some((old) => old.id === n.id));
  if (!group || isSubgraph(group)) return doc;
  const children = descendants(next, group.id);
  if (!next.nodes.some((n) => children.has(n.id) && n.kind === "node")) return doc;
  if (next.edges.some((e) => e.source === group.id || e.target === group.id)) return doc;
  return fitGroups(
    reconcileSubgraphs({
      ...next,
      nodes: next.nodes.map((n) =>
        n.id === group.id
          ? {
              ...n,
              subgraph: true,
              collapsed: true,
              shape: existing?.shape ?? single?.shape ?? "process",
              label: existing?.label ?? single?.label ?? "새 서브그래프",
              ports: [],
            }
          : n,
      ),
    }),
  );
}
export function removeItems(doc: Document, ids: readonly string[]): Document {
  const removed = new Set(ids);
  for (const id of ids) for (const child of descendants(doc, id)) removed.add(child);
  return fitGroups({
    ...doc,
    nodes: doc.nodes.filter((n) => !removed.has(n.id)),
    edges: doc.edges.filter((e) => !removed.has(e.source) && !removed.has(e.target)),
  });
}
export function moveItems(doc: Document, moves: ReadonlyMap<string, Point>): Document {
  const roots = [...moves].filter(([id]) => !ancestors(doc, id).some((p) => moves.has(p)));
  const deltas = roots.flatMap(([id, position]) => {
    const node = doc.nodes.find((n) => n.id === id);
    return node
      ? [
          {
            ids: new Set([id, ...descendants(doc, id)]),
            x: position.x - node.position.x,
            y: position.y - node.position.y,
          },
        ]
      : [];
  });
  return fitGroups({
    ...doc,
    nodes: doc.nodes.map((n) => {
      const delta = deltas.find((d) => d.ids.has(n.id));
      return delta
        ? { ...n, position: { x: n.position.x + delta.x, y: n.position.y + delta.y } }
        : n;
    }),
  });
}
export function visibleRepresentative(
  doc: Document,
  id: string,
  scope: string | null = null,
): string {
  const parents = ancestors(doc, id);
  const boundary = scope ? parents.indexOf(scope) : -1;
  return (
    (boundary < 0 ? parents : parents.slice(0, boundary))
      .reverse()
      .find((parent) => doc.nodes.some((n) => n.id === parent && (n.collapsed || isSubgraph(n)))) ??
    id
  );
}
export function projectGraph(doc: Document, scope: string | null = null) {
  const within = scope ? descendants(doc, scope) : new Set(doc.nodes.map((n) => n.id));
  return {
    nodes: doc.nodes.filter(
      (n) => within.has(n.id) && visibleRepresentative(doc, n.id, scope) === n.id,
    ),
    edges: doc.edges.flatMap((e) => {
      if (!within.has(e.source) || !within.has(e.target)) return [];
      const source = visibleRepresentative(doc, e.source, scope);
      const target = visibleRepresentative(doc, e.target, scope);
      if (source === target && (source !== e.source || target !== e.target)) return [];
      return [
        {
          ...e,
          source,
          target,
          sourceHandle: NODE_HANDLES[e.sourceSide ?? "right"],
          targetHandle: NODE_HANDLES[e.targetSide ?? "left"],
          projected: source !== e.source || target !== e.target,
        },
      ];
    }),
  };
}
