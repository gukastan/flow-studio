import type { Connection } from "@xyflow/react";
import { CONNECTION_SIDES, NODE_HANDLES, portHandle } from "./connectionHandles";
import type { ConnectionSide, Document, Port } from "./model";
import { DocumentError, descendants, isSubgraph } from "./model";
import { boundaryId } from "./scopeGraph";
import { reconcileSubgraphs } from "./subgraphPorts";

function endpoint(
  doc: Document,
  address: {
    readonly nodeId: string;
    readonly handle: string | null;
    readonly direction: Port["direction"];
  },
): { readonly nodeId: string; readonly side: ConnectionSide } {
  const { nodeId, handle, direction } = address;
  const node = doc.nodes.find((n) => n.id === nodeId);
  if (!node) throw new DocumentError("연결할 노드를 찾을 수 없습니다.");
  const defaultSide = direction === "output" ? "right" : "left";
  if (!isSubgraph(node)) {
    const side = handle ? CONNECTION_SIDES.find((s) => NODE_HANDLES[s] === handle) : defaultSide;
    if (!side) throw new DocumentError("연결점이 올바르지 않습니다.");
    return { nodeId, side };
  }
  const sharedSide = handle
    ? CONNECTION_SIDES.find((side) => NODE_HANDLES[side] === handle)
    : defaultSide;
  if (sharedSide) {
    const inside = descendants(doc, node.id);
    const connected = new Set(
      doc.edges
        .filter((edge) =>
          direction === "input"
            ? !inside.has(edge.source) && inside.has(edge.target)
            : inside.has(edge.source) && !inside.has(edge.target),
        )
        .map((edge) => (direction === "input" ? edge.target : edge.source)),
    );
    const ports = node.ports?.filter((port) => port.direction === direction) ?? [];
    const port = ports.find((current) => connected.has(current.nodeId)) ?? ports[0];
    const leaves = doc.nodes
      .filter((current) => inside.has(current.id) && current.kind === "node")
      .sort((a, b) =>
        direction === "input"
          ? a.position.x - b.position.x || a.position.y - b.position.y
          : b.position.x - a.position.x || a.position.y - b.position.y,
      );
    const fallback =
      leaves.find(
        (current) =>
          !doc.edges.some((edge) =>
            direction === "input"
              ? edge.target === current.id && inside.has(edge.source)
              : edge.source === current.id && inside.has(edge.target),
          ),
      ) ?? leaves[0];
    const representative = port?.nodeId ?? fallback?.id;
    if (representative) return { nodeId: representative, side: sharedSide };
    throw new DocumentError("서브그래프 안에 연결할 노드가 없습니다.");
  }
  for (const port of node.ports ?? []) {
    const side = handle
      ? CONNECTION_SIDES.find((s) => portHandle(node, port, s) === handle)
      : port.direction === direction
        ? defaultSide
        : undefined;
    if (side) return { nodeId: port.nodeId, side };
  }
  throw new DocumentError("서브그래프 내부에서 연결할 노드를 먼저 지정해 주세요.");
}

export function connectNodes(
  doc: Document,
  connection: Connection,
  scope: string | null,
): Document {
  const { source, target, sourceHandle, targetHandle } = connection;
  if (scope) {
    const input = boundaryId(doc, scope, "input");
    const output = boundaryId(doc, scope, "output");
    if ([input, output].includes(source) || [input, output].includes(target))
      throw new DocumentError("상위 화면에서 서브그래프 카드와 연결하면 내부에 자동 반영됩니다.");
  }
  if (doc.edges.length >= 5000)
    throw new DocumentError("연결은 최대 5,000개까지 추가할 수 있습니다.");
  const from = endpoint(doc, { nodeId: source, handle: sourceHandle, direction: "output" });
  const to = endpoint(doc, { nodeId: target, handle: targetHandle, direction: "input" });
  return reconcileSubgraphs({
    ...doc,
    edges: [
      ...doc.edges,
      {
        id: `e_${crypto.randomUUID()}`,
        source: from.nodeId,
        target: to.nodeId,
        ...(from.side !== "right" ? { sourceSide: from.side } : {}),
        ...(to.side !== "left" ? { targetSide: to.side } : {}),
        label: "",
        dashed: false,
        arrow: true,
      },
    ],
  });
}
