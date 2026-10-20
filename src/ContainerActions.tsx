import { ChevronDown, ChevronRight, Expand, SlidersHorizontal, Ungroup } from "lucide-react";
import type { Item } from "./model";
import { isSubgraph } from "./model";

type Props = {
  readonly node: Item;
  readonly onToggle: (id: string) => void;
  readonly onUngroup: (id: string) => void;
  readonly onEnter: (id: string) => void;
  readonly onPorts: (id: string) => void;
};
export function ContainerActions({ node, onToggle, onUngroup, onEnter, onPorts }: Props) {
  return (
    <div className="button-stack">
      {isSubgraph(node) ? (
        <>
          <button type="button" onClick={() => onEnter(node.id)}>
            <Expand size={16} /> 내부 편집
          </button>
          <button type="button" onClick={() => onPorts(node.id)}>
            <SlidersHorizontal size={16} /> 입력·출력 편집
          </button>
        </>
      ) : (
        <button type="button" onClick={() => onToggle(node.id)}>
          {node.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          {node.collapsed ? "그룹 펼치기" : "그룹 접기"}
        </button>
      )}
      <button type="button" onClick={() => onUngroup(node.id)}>
        <Ungroup size={16} /> {isSubgraph(node) ? "서브그래프 풀기" : "그룹 해제"}
      </button>
    </div>
  );
}
