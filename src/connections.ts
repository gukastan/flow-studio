import type { Connection } from "@xyflow/react";
import { NODE_HANDLES, verticalPortHandle } from "./connectionHandles";
import type { Document, Port } from "./model";
import { DocumentError, isSubgraph } from "./model";
import { boundaryId } from "./scopeGraph";
import { reconcileSubgraphs } from "./subgraphPorts";

function endpoint(
  doc: Document,
  address: {
    readonly nodeId: string;
    readonly handle: string | null;
    readonly direction: Port["direction"];
  },
): { readonly nodeId: string; readonly vertical: boolean } {
  const { nodeId, handle, direction } = address;
  const node = doc.nodes.find((n) => n.id === nodeId);
  if (!node) throw new DocumentError("연결할 노드를 찾을 수 없습니다.");
  if (!isSubgraph(node)) {
    const handles = NODE_HANDLES[direction];
    if (handle && handle !== handles.horizontal && handle !== handles.vertical)
      throw new DocumentError("입력·출력 연결점이 올바르지 않습니다.");
    return { nodeId, vertical: handle === handles.vertical };
  }
  const port = node.ports?.find(
    (p) =>
      p.direction === direction &&
      (!handle || p.id === handle || verticalPortHandle(node, p.id) === handle),
  );
  if (!port) throw new DocumentError("서브그래프 내부에서 입력·출력을 먼저 추가해 주세요.");
  return { nodeId: port.nodeId, vertical: handle === verticalPortHandle(node, port.id) };
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
        ...(from.vertical ? { sourceSide: "bottom" as const } : {}),
        ...(to.vertical ? { targetSide: "top" as const } : {}),
        label: "",
        dashed: false,
        arrow: true,
      },
    ],
  });
}
