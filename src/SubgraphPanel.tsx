import { ArrowLeft, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { ExposedSettingsPanel } from "./ExposedSettingsPanel";
import type { Document, Item, Port } from "./model";
import { descendants } from "./model";
import { PanelToggle } from "./PanelToggle";
import { editPort, exposePort, removePort } from "./subgraphPorts";
import { TextField } from "./TextField";

type Props = {
  readonly doc: Document;
  readonly group: Item;
  readonly onCommit: (doc: Document) => void;
  readonly onClose: () => void;
  readonly onCollapse: () => void;
};
function PortSection({
  doc,
  group,
  direction,
  onCommit,
}: Omit<Props, "onClose" | "onCollapse"> & { readonly direction: Port["direction"] }) {
  const [chosen, setChosen] = useState("");
  const inside = descendants(doc, group.id);
  const leaves = doc.nodes.filter((n) => inside.has(n.id) && n.kind === "node");
  const ports = group.ports?.filter((p) => p.direction === direction) ?? [];
  const available = leaves.filter((n) => !ports.some((p) => p.nodeId === n.id));
  const target = available.find((n) => n.id === chosen)?.id ?? available[0]?.id ?? "";
  const name = direction === "input" ? "입력" : "출력";
  return (
    <section className="port-section" aria-label={`${name} 슬롯`}>
      <h3>
        {name} <span className="count">{ports.length}</span>
      </h3>
      {ports.map((port, index) => (
        <div className="port-editor" key={port.id}>
          <TextField
            label={`${name} ${index + 1} 이름`}
            value={port.label}
            onChange={(label) => onCommit(editPort(doc, group.id, { id: port.id, label }))}
          />
          <label className="field">
            연결된 내부 노드
            <select
              aria-label={`${name} ${index + 1} 연결 노드`}
              value={port.nodeId}
              onChange={(event) =>
                onCommit(editPort(doc, group.id, { id: port.id, nodeId: event.target.value }))
              }
            >
              {leaves
                .filter((n) => !ports.some((p) => p.id !== port.id && p.nodeId === n.id))
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            className="danger"
            aria-label={`${name} ${index + 1} 삭제`}
            onClick={() => onCommit(removePort(doc, group.id, port.id))}
          >
            <Trash2 size={14} /> {name} 삭제
          </button>
        </div>
      ))}
      {ports.length === 0 && <p className="muted">노출된 {name}이 없습니다.</p>}
      <label className="field">
        {name}으로 노출할 노드
        <select
          aria-label={`${name} 추가 대상`}
          value={target}
          onChange={(event) => setChosen(event.target.value)}
        >
          {!available.length && <option value="">추가할 노드 없음</option>}
          {available.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="full-width"
        disabled={!target}
        onClick={() => onCommit(exposePort(doc, group.id, { direction, nodeId: target }))}
      >
        <Plus size={15} /> {name} 추가
      </button>
    </section>
  );
}
export function SubgraphPanel(props: Props) {
  return (
    <aside className="inspector panel" id="inspector-panel" aria-label="서브그래프 입출력 편집">
      <div className="panel-heading">
        <SlidersHorizontal size={16} />
        <h2>입력·출력</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="노드 속성으로 돌아가기"
          onClick={props.onClose}
        >
          <ArrowLeft size={16} />
        </button>
        <PanelToggle side="inspector" expanded onClick={props.onCollapse} />
      </div>
      <div className="inspector-body">
        <p className="port-group-name">{props.group.label}</p>
        <p className="muted">
          상위 화면에서 서브그래프 카드에 연결한 선이 내부에 자동 반영됩니다. 여기서는 연결점의
          이름과 대상을 지정합니다. 슬롯 삭제 시 해당 외부 연결도 해제되며 되돌릴 수 있습니다.
        </p>
        <PortSection {...props} direction="input" />
        <PortSection {...props} direction="output" />
        <ExposedSettingsPanel {...props} />
      </div>
    </aside>
  );
}
