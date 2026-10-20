import type { Node, NodeProps } from "@xyflow/react";
import { useUpdateNodeInternals } from "@xyflow/react";
import { Check, ChevronDown, ChevronRight, Diamond, Layers, MoreHorizontal } from "lucide-react";
import type { CSSProperties } from "react";
import { memo, useEffect, useState } from "react";
import { ConnectionPoints } from "./ConnectionPoints";
import type { SettingChange, SettingValue } from "./exposedSettings";
import type { Item, Port } from "./model";
import { isSubgraph } from "./model";
import { SubgraphCard } from "./SubgraphCard";

export type CanvasData = {
  item: Item;
  count: number;
  onRename: (id: string, name: string) => void;
  onToggle: (id: string) => void;
  onEnter: (id: string) => void;
  settings: readonly SettingValue[];
  onSetting: (groupId: string, change: SettingChange) => void;
  boundary?: Port["direction"];
};
export type FlowNode = Node<CanvasData, "card">;
type NodeStyle = CSSProperties & { "--node-color": string };

export const CanvasNode = memo(function CanvasNode({ data, selected }: NodeProps<FlowNode>) {
  const [editing, setEditing] = useState(false);
  const { item, count, onRename, onToggle } = data;
  const updateInternals = useUpdateNodeInternals();
  const portKey = item.ports?.map((p) => p.id).join("|");
  // Slot identity can change without changing the card's measured size.
  useEffect(() => {
    if (portKey !== undefined) updateInternals(item.id);
  }, [portKey, item.id, updateInternals]);
  const expanded = item.kind === "group" && !item.collapsed;
  const style: NodeStyle = { "--node-color": item.color };
  if (isSubgraph(item) || data.boundary) {
    return (
      <div className={`graph-card subgraph-card ${selected ? "is-selected" : ""}`} style={style}>
        <SubgraphCard
          item={item}
          onEnter={data.onEnter}
          settings={data.settings}
          onSetting={data.onSetting}
          {...(data.boundary ? { boundary: data.boundary } : {})}
        />
      </div>
    );
  }
  const name = editing ? (
    <input
      className="nodrag node-name-input"
      aria-label="노드 이름 편집"
      defaultValue={item.label}
      maxLength={1000}
      ref={(el) => el?.focus()}
      onBlur={(e) => {
        onRename(item.id, e.target.value);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  ) : (
    <button
      type="button"
      className="node-label nodrag"
      title="이름 편집"
      aria-label={`${item.label} 이름 편집`}
      onClick={() => setEditing(true)}
    >
      {item.label || "이름 없는 노드"}
    </button>
  );
  return (
    <div
      className={`graph-card ${expanded ? "group-frame" : ""} ${selected ? "is-selected" : ""}`}
      style={style}
    >
      <ConnectionPoints item={item} />
      <div className="card-header">
        <div className="node-meta">
          {item.kind === "group" ? (
            <Layers size={13} />
          ) : item.shape === "decision" ? (
            <Diamond size={13} />
          ) : (
            <span className="color-dot" />
          )}
          <span>
            {item.kind === "group"
              ? `그룹 · ${count}개 노드`
              : item.shape === "decision"
                ? "조건 / 분기"
                : item.shape === "terminal"
                  ? "시작 / 종료"
                  : "프로세스"}
          </span>
          {selected ? (
            <Check size={13} className="selection-check" />
          ) : (
            <MoreHorizontal size={15} className="selection-check" />
          )}
        </div>
        <div className="node-title-row">
          {name}
          {item.kind === "group" && (
            <button
              type="button"
              className="fold-button nodrag"
              aria-label={`${item.label} ${item.collapsed ? "펼치기" : "접기"}`}
              title={item.collapsed ? "펼치기" : "접기"}
              onClick={() => onToggle(item.id)}
            >
              {item.collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
