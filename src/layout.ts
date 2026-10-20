import dagre from "@dagrejs/dagre";
import { fitGroups } from "./graph";
import type { Document } from "./model";
import { ancestors } from "./model";

export function autoLayout(doc: Document, direction = "LR", scope: string | null = null): Document {
  let nodes = [...doc.nodes];
  function arrange(parent: string | null) {
    const children = nodes.filter((n) => n.parent === parent);
    for (const group of children.filter((n) => n.kind === "group")) arrange(group.id);
    const graph = new dagre.graphlib.Graph({ multigraph: true });
    graph.setGraph({ rankdir: direction, nodesep: 64, ranksep: 120, marginx: 0, marginy: 0 });
    graph.setDefaultEdgeLabel(() => ({}));
    for (const child of children) {
      const current = nodes.find((n) => n.id === child.id) ?? child;
      graph.setNode(child.id, { width: current.width, height: current.height });
    }
    const childIds = new Set(children.map((n) => n.id));
    const childOf = (id: string) => [id, ...ancestors(doc, id)].find((n) => childIds.has(n));
    for (const edge of doc.edges) {
      const source = childOf(edge.source);
      const target = childOf(edge.target);
      if (source && target && source !== target) graph.setEdge(source, target, {}, edge.id);
    }
    dagre.layout(graph);
    for (const child of children) {
      const placed = graph.node(child.id);
      if (!placed) continue;
      const current = nodes.find((n) => n.id === child.id) ?? child;
      const dx = placed.x - current.width / 2 - current.position.x;
      const dy = placed.y - current.height / 2 - current.position.y;
      nodes = nodes.map((n) =>
        n.id === child.id || ancestors(doc, n.id).includes(child.id)
          ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
          : n,
      );
    }
    nodes = fitGroups({ ...doc, nodes }).nodes;
  }
  arrange(scope);
  return { ...doc, nodes };
}
