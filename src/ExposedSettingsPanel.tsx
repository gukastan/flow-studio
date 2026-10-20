import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { exposeSetting, SETTING_LABELS } from "./exposedSettings";
import type { Document, ExposedSetting, Item } from "./model";
import { descendants, nodeSettingsSchema } from "./model";
import { TextField } from "./TextField";

type Props = {
  readonly doc: Document;
  readonly group: Item;
  readonly onCommit: (doc: Document) => void;
};
export function ExposedSettingsPanel({ doc, group, onCommit }: Props) {
  const [chosen, setChosen] = useState("");
  const [property, setProperty] = useState<ExposedSetting["property"]>("label");
  const inside = descendants(doc, group.id);
  const settings = group.exposedSettings ?? [];
  const available = doc.nodes.filter(
    (n) =>
      inside.has(n.id) &&
      n.kind === "node" &&
      !settings.some((s) => s.nodeId === n.id && s.property === property),
  );
  const target = available.find((n) => n.id === chosen)?.id ?? available[0]?.id ?? "";
  function replaceSettings(next: ExposedSetting[]) {
    onCommit({
      ...doc,
      nodes: doc.nodes.map((n) => (n.id === group.id ? { ...n, exposedSettings: next } : n)),
    });
  }
  return (
    <section className="port-section" aria-label="바깥 카드 설정">
      <h3>
        바깥 카드 설정 <span className="count">{settings.length}</span>
      </h3>
      <p className="muted">내부 노드의 설정을 바깥 카드에서 바로 편집할 수 있습니다.</p>
      {settings.map((setting, index) => (
        <div className="port-editor" key={setting.id}>
          <TextField
            label={`설정 ${index + 1} 표시 이름`}
            value={setting.label}
            onChange={(label) =>
              replaceSettings(settings.map((s) => (s.id === setting.id ? { ...s, label } : s)))
            }
          />
          <span className="muted">
            {doc.nodes.find((n) => n.id === setting.nodeId)?.label} ·{" "}
            {SETTING_LABELS[setting.property]}
          </span>
          <button
            type="button"
            aria-label={`설정 ${index + 1} 노출 해제`}
            onClick={() => replaceSettings(settings.filter((s) => s.id !== setting.id))}
          >
            <Trash2 size={14} /> 노출 해제
          </button>
        </div>
      ))}
      <label className="field">
        노출할 설정
        <select
          value={property}
          onChange={(event) => setProperty(nodeSettingsSchema.keyof().parse(event.target.value))}
        >
          {Object.entries(SETTING_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        설정의 내부 노드
        <select value={target} onChange={(event) => setChosen(event.target.value)}>
          {!available.length && <option value="">추가할 설정 없음</option>}
          {available.map((node) => (
            <option key={node.id} value={node.id}>
              {node.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="full-width"
        disabled={!target}
        onClick={() => onCommit(exposeSetting(doc, group.id, { nodeId: target, property }))}
      >
        <Plus size={15} /> 바깥 카드에 설정 추가
      </button>
    </section>
  );
}
