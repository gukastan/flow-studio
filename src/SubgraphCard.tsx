import { Handle, Position } from "@xyflow/react";
import { ArrowDownToLine, Expand, Network } from "lucide-react";
import { ConnectionPoints } from "./ConnectionPoints";
import { endpointPorts } from "./connectionHandles";
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
  const ports = boundary ? (item.ports ?? []) : endpointPorts(item);
  const shapeName = {
    process: "프로세스",
    decision: "조건 / 분기",
    terminal: "시작 / 종료",
  }[item.shape];
  return (
    <>
      <div className="card-header subgraph-header">
        <div className="node-meta">
          {boundary ? <ArrowDownToLine size={14} /> : <Network size={14} />}
          <span>{boundary ? "외부 연결" : `서브그래프 · ${shapeName}`}</span>
        </div>
        <div className="node-title-row">
          <span className="subgraph-name" title={item.label}>
            {item.label}
          </span>
          <button
            type="button"
            className="fold-button nodrag"
            title={boundary ? "입력·출력 편집" : "내부 편집"}
            aria-label={`${item.label} ${boundary ? "설정" : "내부 편집"}`}
            onClick={() => onEnter(item.id)}
          >
            <Expand size={17} />
          </button>
        </div>
      </div>
      <div className="subgraph-slots">
        {ports.map((port, index) => {
          const left = boundary !== "input";
          const labels = boundary
            ? [port.label]
            : [...new Set(item.ports?.filter((p) => p.nodeId === port.nodeId).map((p) => p.label))];
          return (
            <div className="slot-row" key={port.id}>
              <div
                className={`slot-label ${boundary ? (left ? "slot-left" : "slot-right") : "slot-endpoint"}`}
                title={labels.join(" / ")}
              >
                {boundary ? (
                  <Handle
                    type={left ? "target" : "source"}
                    position={left ? Position.Left : Position.Right}
                    id={port.id}
                    isConnectable={false}
                    style={{ top: 76 + index * 28 }}
                    aria-label={`${item.label} ${port.label} ${left ? "입력" : "출력"} 연결점`}
                  />
                ) : (
                  <ConnectionPoints item={item} slot={{ port, index, count: ports.length }} />
                )}
                {labels.join(" / ") || "이름 없는 연결"}
              </div>
            </div>
          );
        })}
        {ports.length === 0 ? (
          <p className="slot-empty">
            {boundary ? "상위 화면의 연결이 표시됩니다" : "입력·출력 설정에서 연결점을 지정하세요"}
          </p>
        ) : null}
      </div>
      {!boundary && settings.length > 0 && (
        <ExposedControls values={settings} onChange={(change) => onSetting(item.id, change)} />
      )}
    </>
  );
}
