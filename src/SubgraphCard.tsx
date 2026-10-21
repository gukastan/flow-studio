import { Handle, Position } from "@xyflow/react";
import { ArrowDownToLine, Expand, Network } from "lucide-react";
import { ConnectionPoints } from "./ConnectionPoints";
import { NODE_HANDLES } from "./connectionHandles";
import { ExposedControls } from "./ExposedControls";
import type { SettingChange, SettingValue } from "./exposedSettings";
import type { Item, Port } from "./model";

type Props = {
  readonly item: Item;
  readonly boundary?: Port["direction"];
  readonly onEnter: (id: string) => void;
  readonly settings: readonly SettingValue[];
  readonly onSetting: (groupId: string, change: SettingChange) => void;
};
export function SubgraphCard({ item, boundary, onEnter, settings, onSetting }: Props) {
  const shapeName = {
    process: "프로세스",
    decision: "조건 / 분기",
    terminal: "시작 / 종료",
  }[item.shape];
  return (
    <>
      {boundary ? (
        <Handle
          type={boundary === "input" ? "source" : "target"}
          position={boundary === "input" ? Position.Right : Position.Left}
          id={boundary === "input" ? NODE_HANDLES.right : NODE_HANDLES.left}
          isConnectable={false}
          aria-label={`서브그래프 ${boundary === "input" ? "입력" : "출력"} 연결점`}
        />
      ) : (
        <ConnectionPoints item={item} />
      )}
      <div className="card-header subgraph-header">
        <div className="node-meta">
          {boundary ? <ArrowDownToLine size={14} /> : <Network size={14} />}
          <span>
            {boundary
              ? `서브그래프 ${boundary === "input" ? "입력" : "출력"}`
              : `서브그래프 · ${shapeName}`}
          </span>
        </div>
        <div className="node-title-row">
          <span className="subgraph-name" title={item.label}>
            {item.label}
          </span>
          <button
            type="button"
            className="fold-button nodrag"
            title={boundary ? "입력·출력 편집" : "내부 편집"}
            aria-label={boundary ? "서브그래프 입력·출력 설정" : `${item.label} 내부 편집`}
            onClick={() => onEnter(item.id)}
          >
            <Expand size={17} />
          </button>
        </div>
      </div>
      {!boundary && settings.length > 0 && (
        <ExposedControls values={settings} onChange={(change) => onSetting(item.id, change)} />
      )}
    </>
  );
}
