import { ChevronDown, ChevronRight, Layers, Search, Square } from "lucide-react";
import { useState } from "react";
import type { Document } from "./model";
import { ancestors, isSubgraph } from "./model";
import { PanelToggle } from "./PanelToggle";

type Props = {
  doc: Document;
  selected: readonly string[];
  onSelect: (ids: string[]) => void;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
  onEnter: (id: string) => void;
  onCollapse: () => void;
};
export function Outline({
  doc,
  selected,
  onSelect,
  onToggle,
  onFocus,
  onEnter,
  onCollapse,
}: Props) {
  const [search, setSearch] = useState("");
  const ordered = (parent: string | null): typeof doc.nodes =>
    doc.nodes.filter((n) => n.parent === parent).flatMap((n) => [n, ...ordered(n.id)]);
  const nodes = ordered(null).filter((n) => n.label.toLowerCase().includes(search.toLowerCase()));
  return (
    <aside className="outline panel" id="outline-panel" aria-label="흐름도 구조">
      <div className="panel-heading">
        <Layers size={16} />
        <h2>구조</h2>
        <span className="count">{doc.nodes.length}</span>
        <PanelToggle side="outline" expanded onClick={onCollapse} />
      </div>
      <div className="search-field">
        <Search size={15} />
        <input
          aria-label="노드 검색"
          placeholder="노드 검색…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="outline-list">
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`outline-row ${selected.includes(node.id) ? "active" : ""}`}
            style={{ paddingInlineStart: 12 + ancestors(doc, node.id).length * 16 }}
          >
            <input
              type="checkbox"
              aria-label={`${node.label} 선택`}
              checked={selected.includes(node.id)}
              onChange={(e) =>
                onSelect(
                  e.target.checked
                    ? [...selected, node.id]
                    : selected.filter((id) => id !== node.id),
                )
              }
            />
            {node.kind === "group" ? (
              <button
                type="button"
                className="icon-button tiny"
                aria-label={`목록에서 ${node.label} ${isSubgraph(node) ? "내부 편집" : node.collapsed ? "펼치기" : "접기"}`}
                onClick={() => (isSubgraph(node) ? onEnter(node.id) : onToggle(node.id))}
              >
                {node.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : (
              <Square size={11} style={{ color: node.color }} />
            )}
            <button
              type="button"
              className="outline-name"
              title={node.label}
              onClick={() => {
                onSelect([node.id]);
                onFocus(node.id);
              }}
            >
              {node.label || "이름 없는 노드"}
            </button>
          </div>
        ))}
        {nodes.length === 0 && <p className="panel-empty">표시할 노드가 없습니다.</p>}
      </div>
      <div className="outline-bottom">
        <span className="eyebrow">YOUR IDEAS, CONNECTED</span>
        <p>
          작은 생각을 연결해서
          <br />더 큰 흐름을 만드세요.
        </p>
        <div className="keyboard-tip">
          <kbd>Shift</kbd> 여러 노드 선택
        </div>
      </div>
    </aside>
  );
}
