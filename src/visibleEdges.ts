import type { Document, Item } from "./model";
import { isSubgraph } from "./model";
import { scopeGraph } from "./scopeGraph";

type ProjectedEdge = ReturnType<typeof scopeGraph>["edges"][number];
type Bundle = { readonly edge: ProjectedEdge; readonly memberIds: readonly string[] };

export function visibleEdgeBundles(graph: ReturnType<typeof scopeGraph>): readonly Bundle[] {
  const subgraphs = new Set(graph.nodes.filter(isSubgraph).map((node) => node.id));
  const bundles: { edge: ProjectedEdge; members: ProjectedEdge[] }[] = [];
  const byPair = new Map<string, number>();
  for (const edge of graph.edges) {
    const merge = edge.projected && (subgraphs.has(edge.source) || subgraphs.has(edge.target));
    const pair = merge ? JSON.stringify([edge.source, edge.target]) : null;
    const index = pair === null ? undefined : byPair.get(pair);
    if (index !== undefined) {
      bundles[index]?.members.push(edge);
      continue;
    }
    if (pair !== null) byPair.set(pair, bundles.length);
    bundles.push({ edge, members: [edge] });
  }
  return bundles.map(({ edge, members }) => ({
    edge: {
      ...edge,
      label: members.every((member) => member.label === edge.label) ? edge.label : "",
      dashed: members.every((member) => member.dashed),
      arrow: members.some((member) => member.arrow),
    },
    memberIds: members.map((member) => member.id),
  }));
}

export function realEdgeIdsForVisible(
  doc: Document,
  scope: Item | null,
  selectedIds: readonly string[],
): ReadonlySet<string> {
  const selected = new Set(selectedIds);
  for (const bundle of visibleEdgeBundles(scopeGraph(doc, scope))) {
    if (selected.has(bundle.edge.id))
      for (const memberId of bundle.memberIds) selected.add(memberId);
  }
  return selected;
}
