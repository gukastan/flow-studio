import type { Document, Item, Port } from "./model";

export const NODE_HANDLES = {
  input: { horizontal: "in", vertical: "in-top" },
  output: { horizontal: "out", vertical: "out-bottom" },
} as const;

export function verticalPortHandle(group: Item, portId: string): string {
  let prefix = "vertical:";
  while (group.ports?.some((port) => port.id.startsWith(prefix))) prefix = `:${prefix}`;
  return `${prefix}${portId}`;
}

export function endpointHandle(
  doc: Document,
  endpoint: {
    readonly nodeId: string;
    readonly visibleId: string;
    readonly direction: Port["direction"];
    readonly vertical: boolean;
  },
): string {
  const visible = doc.nodes.find((node) => node.id === endpoint.visibleId);
  const port = visible?.ports?.find(
    (p) => p.direction === endpoint.direction && p.nodeId === endpoint.nodeId,
  );
  if (port && visible) return endpoint.vertical ? verticalPortHandle(visible, port.id) : port.id;
  return NODE_HANDLES[endpoint.direction][endpoint.vertical ? "vertical" : "horizontal"];
}
