import type { Document, Item, Port } from "./model";
import { ancestors, descendants, isSubgraph } from "./model";

export function newPort(node: Item, direction: Port["direction"]): Port {
  return { id: `p_${crypto.randomUUID()}`, direction, nodeId: node.id, label: node.label };
}

export function reconcileSubgraphs(doc: Document): Document {
  return {
    ...doc,
    nodes: doc.nodes.map((group) => {
      if (!isSubgraph(group)) return group;
      const children = descendants(doc, group.id);
      const leaves = doc.nodes.filter((n) => children.has(n.id) && n.kind === "node");
      const leafById = new Map(leaves.map((n) => [n.id, n]));
      const settings = group.exposedSettings?.filter((s) => leafById.has(s.nodeId));
      const ports = (group.ports ?? []).filter((p) => leafById.has(p.nodeId));
      const parentIds = new Set(ancestors(doc, group.id));
      const inherited = doc.nodes
        .filter((n) => parentIds.has(n.id) && isSubgraph(n))
        .flatMap((n) => n.ports ?? []);
      for (const port of inherited) {
        const node = leafById.get(port.nodeId);
        if (node && !ports.some((p) => p.direction === port.direction && p.nodeId === node.id))
          ports.push(newPort(node, port.direction));
      }
      for (const edge of doc.edges) {
        const incoming = !children.has(edge.source) && children.has(edge.target);
        const outgoing = children.has(edge.source) && !children.has(edge.target);
        if (!incoming && !outgoing) continue;
        const direction = incoming ? "input" : "output";
        const node = leafById.get(incoming ? edge.target : edge.source);
        if (node && !ports.some((p) => p.direction === direction && p.nodeId === node.id))
          ports.push(newPort(node, direction));
      }
      return {
        ...group,
        ports,
        ...(settings ? { exposedSettings: settings } : {}),
        width: 224,
        height: 88 + (settings?.length ?? 0) * 44,
      };
    }),
  };
}

export function exposePort(
  doc: Document,
  groupId: string,
  endpoint: { readonly nodeId: string; readonly direction: Port["direction"] },
): Document {
  const group = doc.nodes.find((n) => n.id === groupId);
  const node = doc.nodes.find((n) => n.id === endpoint.nodeId);
  if (!isSubgraph(group) || !group || node?.kind !== "node") return doc;
  if (!descendants(doc, groupId).has(node.id)) return doc;
  if (group.ports?.some((p) => p.nodeId === node.id && p.direction === endpoint.direction))
    return doc;
  return reconcileSubgraphs({
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.id === groupId
        ? { ...n, ports: [...(n.ports ?? []), newPort(node, endpoint.direction)] }
        : n,
    ),
  });
}

export function editPort(
  doc: Document,
  groupId: string,
  change: { readonly id: string; readonly label?: string; readonly nodeId?: string },
): Document {
  const group = doc.nodes.find((n) => n.id === groupId);
  const port = group?.ports?.find((p) => p.id === change.id);
  if (!group || !port) return doc;
  const children = descendants(doc, groupId);
  if (
    change.nodeId &&
    (!children.has(change.nodeId) ||
      doc.nodes.find((n) => n.id === change.nodeId)?.kind !== "node" ||
      group.ports?.some(
        (p) => p.id !== port.id && p.direction === port.direction && p.nodeId === change.nodeId,
      ))
  )
    return doc;
  return reconcileSubgraphs({
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.id === groupId
        ? { ...n, ports: n.ports?.map((p) => (p.id === port.id ? { ...p, ...change } : p)) }
        : n,
    ),
    edges: doc.edges.map((edge) => {
      if (!change.nodeId) return edge;
      if (port.direction === "input" && edge.target === port.nodeId && !children.has(edge.source))
        return { ...edge, target: change.nodeId };
      if (port.direction === "output" && edge.source === port.nodeId && !children.has(edge.target))
        return { ...edge, source: change.nodeId };
      return edge;
    }),
  });
}

export function removePort(doc: Document, groupId: string, portId: string): Document {
  const group = doc.nodes.find((n) => n.id === groupId);
  const port = group?.ports?.find((p) => p.id === portId);
  if (!port) return doc;
  const children = descendants(doc, groupId);
  const parentIds = new Set(ancestors(doc, groupId));
  return {
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.id === groupId || parentIds.has(n.id)
        ? {
            ...n,
            ports: n.ports?.filter(
              (p) => p.nodeId !== port.nodeId || p.direction !== port.direction,
            ),
          }
        : n,
    ),
    edges: doc.edges.filter((e) =>
      port.direction === "input"
        ? !(e.target === port.nodeId && !children.has(e.source))
        : !(e.source === port.nodeId && !children.has(e.target)),
    ),
  };
}
