import type { ConnectionSide, Document, Item, Port } from "./model";

export const NODE_HANDLES = {
  left: "in",
  top: "in-top",
  right: "out",
  bottom: "out-bottom",
} as const;
export const CONNECTION_SIDES = ["left", "top", "right", "bottom"] as const;

export function endpointPorts(group: Item): readonly Port[] {
  const seen = new Set<string>();
  return (group.ports ?? []).filter((port) => {
    if (seen.has(port.nodeId)) return false;
    seen.add(port.nodeId);
    return true;
  });
}

export function verticalPortHandle(group: Item, portId: string): string {
  let prefix = "vertical:";
  while (group.ports?.some((port) => port.id.startsWith(prefix))) prefix = `:${prefix}`;
  return `${prefix}${portId}`;
}

export function portHandle(group: Item, port: Port, side: ConnectionSide): string {
  const horizontal = port.direction === "input" ? "left" : "right";
  const vertical = port.direction === "input" ? "top" : "bottom";
  if (side === horizontal) return port.id;
  if (side === vertical) return verticalPortHandle(group, port.id);
  let prefix = "side:";
  while (group.ports?.some((p) => p.id.startsWith(prefix))) prefix = `:${prefix}`;
  return `${prefix}${side}:${port.id}`;
}

export function endpointHandle(
  doc: Document,
  endpoint: {
    readonly nodeId: string;
    readonly visibleId: string;
    readonly side: ConnectionSide;
  },
): string {
  const visible = doc.nodes.find((node) => node.id === endpoint.visibleId);
  const port = visible && endpointPorts(visible).find((p) => p.nodeId === endpoint.nodeId);
  if (port && visible) return portHandle(visible, port, endpoint.side);
  return NODE_HANDLES[endpoint.side];
}
