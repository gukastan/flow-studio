import type { Connection } from "@xyflow/react";
import type { Document, Port } from "./model";
import { DocumentError, isSubgraph } from "./model";
import { boundaryId } from "./scopeGraph";
import { reconcileSubgraphs } from "./subgraphPorts";

function endpoint(
  doc: Document,
  nodeId: string,
  handle: string | null,
  direction: Port["direction"],
): string {
  const node = doc.nodes.find((n) => n.id === nodeId);
  if (!node) throw new DocumentError("연결할 노드를 찾을 수 없습니다.");
  if (!isSubgraph(node)) return nodeId;
  const port = node.ports?.find((p) => p.direction === direction && (!handle || p.id === handle));
  if (!port) throw new DocumentError("서브그래프 내부에서 입력·출력을 먼저 추가해 주세요.");
  return port.nodeId;
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
  return reconcileSubgraphs({
    ...doc,
    edges: [
      ...doc.edges,
      {
        id: `e_${crypto.randomUUID()}`,
        source: endpoint(doc, source, sourceHandle, "output"),
        target: endpoint(doc, target, targetHandle, "input"),
        label: "",
        dashed: false,
        arrow: true,
      },
    ],
  });
}
