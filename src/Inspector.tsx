import { ArrowRight, Check, Layers, MousePointer2, SlidersHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { ContainerActions } from "./ContainerActions";
import { visibleRepresentative } from "./graph";
import type { Document, Item, Link } from "./model";
import { descendants, isSubgraph, PALETTE } from "./model";
import { scopeGraph } from "./scopeGraph";
import { TextField } from "./TextField";
import { visibleEdgeBundles } from "./visibleEdges";

type Props = {
  doc: Document;
  scope: Item | null;
  selected: readonly string[];
  edgeId: string | null;
  onPatch: (patch: Partial<Item>) => void;
  onEdgePatch: (id: string, patch: Partial<Link>) => void;
  onDelete: () => void;
  onGroup: () => void;
  onUngroup: (id: string) => void;
  onToggle: (id: string) => void;
  onEnter: (id: string) => void;
  connectable: readonly Item[];
  onConnect: (source: string, target: string) => void;
  onReparent: (id: string, parent: string | null) => void;
};
export function Inspector(props: Props) {
  const { doc, selected, edgeId } = props;
  const [target, setTarget] = useState("");
  const node = doc.nodes.find((n) => n.id === selected[0]);
  const edge = doc.edges.find((e) => e.id === edgeId);
  const displayedEdge = edge
    ? visibleEdgeBundles(scopeGraph(doc, props.scope)).find((bundle) => bundle.edge.id === edge.id)
    : undefined;
  const visualEdge = displayedEdge?.edge ?? edge;
  const source = edge ? visibleRepresentative(doc, edge.source, props.scope?.id ?? null) : null;
  const targetId = edge ? visibleRepresentative(doc, edge.target, props.scope?.id ?? null) : null;
  const blocked = node ? descendants(doc, node.id) : new Set<string>();
  return (
    <aside className="inspector panel" aria-label="속성 편집">
      <div className="panel-heading">
        <SlidersHorizontal size={16} />
        <h2>속성</h2>
        <span className="count">{selected.length || (edge ? 1 : 0)}</span>
      </div>
      <div className="inspector-body">
        {node ? (
          <>
            <div className="section-heading">
              <span className="eyebrow">
                {selected.length > 1
                  ? "MULTI SELECTION"
                  : node.kind === "group"
                    ? isSubgraph(node)
                      ? "SUBGRAPH"
                      : "GROUP"
                    : "NODE"}
              </span>
              <span className="muted">
                {selected.length > 1 ? `${selected.length}개 선택` : node.id}
              </span>
            </div>
            {selected.length === 1 && (
              <TextField
                label="이름"
                value={node.label}
                multiline
                onChange={(label) => props.onPatch({ label })}
              />
            )}
            <div className="field">
              색상
              <div className="palette">
                {PALETTE.map((color) => (
                  <button
                    type="button"
                    key={color.value}
                    title={color.name}
                    aria-label={`${color.name} 색상`}
                    aria-pressed={node.color.toLowerCase() === color.value}
                    className="swatch"
                    style={{ background: color.value }}
                    onClick={() => props.onPatch({ color: color.value })}
                  >
                    {node.color.toLowerCase() === color.value && (
                      <Check size={16} color="#020617" />
                    )}
                  </button>
                ))}
              </div>
              <label className="custom-color">
                <input
                  type="color"
                  aria-label="사용자 지정 색상"
                  value={node.color}
                  onChange={(e) => props.onPatch({ color: e.target.value })}
                />
                <span>직접 선택</span>
                <code>{node.color.toUpperCase()}</code>
              </label>
            </div>
            {selected.length === 1 && (
              <>
                {(node.kind === "node" || isSubgraph(node)) && (
                  <label className="field">
                    노드 유형
                    <select
                      value={node.shape}
                      onChange={(e) => {
                        const shape = e.target.value;
                        if (shape === "process" || shape === "decision" || shape === "terminal")
                          props.onPatch({ shape });
                      }}
                    >
                      <option value="process">프로세스</option>
                      <option value="decision">조건 / 분기</option>
                      <option value="terminal">시작 / 종료</option>
                    </select>
                  </label>
                )}
                <label className="field">
                  소속 그룹
                  <select
                    value={node.parent ?? ""}
                    onChange={(e) => props.onReparent(node.id, e.target.value || null)}
                  >
                    <option value="">그룹 없음</option>
                    {doc.nodes
                      .filter((n) => n.kind === "group" && n.id !== node.id && !blocked.has(n.id))
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                  </select>
                </label>
                {node.kind === "group" && (
                  <ContainerActions
                    node={node}
                    onToggle={props.onToggle}
                    onUngroup={props.onUngroup}
                    onEnter={props.onEnter}
                  />
                )}
                <div className="divider" />
                <label className="field">
                  다른 노드로 연결
                  <select
                    aria-label="연결 대상"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    <option value="">대상 선택…</option>
                    {props.connectable
                      .filter((n) => n.id !== node.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.label}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="full-width"
                  disabled={!doc.nodes.some((n) => n.id === target) || target === node.id}
                  onClick={() => {
                    props.onConnect(node.id, target);
                    setTarget("");
                  }}
                >
                  <ArrowRight size={16} />
                  연결 추가
                </button>
              </>
            )}
            <div className="divider" />
            {!(selected.length === 1 && node.kind === "group") && (
              <button type="button" className="full-width" onClick={props.onGroup}>
                <Layers size={16} />
                선택 항목 그룹화
              </button>
            )}
            <button type="button" className="danger full-width" onClick={props.onDelete}>
              <Trash2 size={16} />
              {node.kind === "group" ? "그룹과 내부 노드 삭제" : "선택 항목 삭제"}
            </button>
          </>
        ) : edge ? (
          <>
            <span className="eyebrow">CONNECTION</span>
            <TextField
              label="연결 이름"
              value={visualEdge?.label ?? ""}
              onChange={(label) => props.onEdgePatch(edge.id, { label })}
            />
            <p className="connection-description">
              {doc.nodes.find((n) => n.id === source)?.label}
              <ArrowRight size={16} />
              {doc.nodes.find((n) => n.id === targetId)?.label}
            </p>
            {displayedEdge && displayedEdge.memberIds.length > 1 && (
              <p className="muted">
                내부 연결 {displayedEdge.memberIds.length}개에 함께 적용됩니다.
              </p>
            )}
            <label className="check-field">
              <input
                type="checkbox"
                checked={visualEdge?.dashed ?? false}
                onChange={(e) => props.onEdgePatch(edge.id, { dashed: e.target.checked })}
              />
              점선으로 표시
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={visualEdge?.arrow ?? false}
                onChange={(e) => props.onEdgePatch(edge.id, { arrow: e.target.checked })}
              />
              화살표 표시
            </label>
            <button type="button" className="danger full-width" onClick={props.onDelete}>
              <Trash2 size={16} />
              연결 삭제
            </button>
          </>
        ) : (
          <div className="inspector-empty">
            <div className="empty-icon">
              <MousePointer2 size={24} />
            </div>
            <h3>생각을 선택하세요</h3>
            <p>
              노드나 연결선을 클릭하면
              <br />
              이곳에서 편집할 수 있어요.
            </p>
            <div className="guide-step">
              <span>01</span>
              <p>이름과 색을 바꾸고</p>
            </div>
            <div className="guide-step">
              <span>02</span>
              <p>관련된 생각을 묶고</p>
            </div>
            <div className="guide-step">
              <span>03</span>
              <p>접어서 전체를 살펴보세요</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
