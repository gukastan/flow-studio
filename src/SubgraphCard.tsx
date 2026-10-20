import { Handle, Position } from "@xyflow/react";
import { ArrowDownToLine, Expand, Network } from "lucide-react";
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
  const inputs = item.ports?.filter((p) => p.direction === "input") ?? [];
  const outputs = item.ports?.filter((p) => p.direction === "output") ?? [];
  const rows = Math.max(inputs.length, outputs.length);
  return (
    <>
      <div className="card-header subgraph-header">
        <div className="node-meta">
          {boundary ? <ArrowDownToLine size={14} /> : <Network size={14} />}
          <span>{boundary ? "외부 연결" : "서브그래프"}</span>
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
        {Array.from({ length: rows }, (_, index) => (
          <div className="slot-row" key={inputs[index]?.id ?? outputs[index]?.id}>
            {[inputs[index], outputs[index]].map((port) => {
              if (!port) return null;
              const left = boundary ? boundary === "output" : port.direction === "input";
              return (
                <div
                  key={port.id}
                  className={`slot-label ${left ? "slot-left" : "slot-right"}`}
                  title={port.label}
                >
                  <Handle
                    type={left ? "target" : "source"}
                    position={left ? Position.Left : Position.Right}
                    id={port.id}
                    isConnectable={!boundary}
                    style={{ top: 76 + index * 28 }}
                    aria-label={`${item.label} ${port.label} ${left ? "입력" : "출력"} 연결점`}
                  />
                  {port.label || "이름 없는 연결"}
                </div>
              );
            })}
          </div>
        ))}
        {rows === 0 ? (
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
