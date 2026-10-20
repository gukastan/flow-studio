import { Circle } from "lucide-react";
import type { Document } from "./model";
import { isSubgraph } from "./model";

export function StatusBar({ doc, warning }: { readonly doc: Document; readonly warning: string }) {
  return (
    <footer className="status-bar">
      <span>
        <Circle size={7} fill="currentColor" />
        {warning || "이 브라우저에 자동 저장"}
      </span>
      <span>
        {doc.nodes.filter((n) => n.kind === "node").length} 노드 <i>·</i> {doc.edges.length} 연결{" "}
        <i>·</i> {doc.nodes.filter((n) => n.kind === "group" && !isSubgraph(n)).length} 그룹
        {doc.nodes.some(isSubgraph) && (
          <>
            {" "}
            <i>·</i> {doc.nodes.filter(isSubgraph).length} 서브그래프
          </>
        )}
      </span>
      <span className="status-right">내 파일, 내 작업 공간</span>
    </footer>
  );
}
