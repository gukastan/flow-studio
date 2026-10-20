import { selectionRoots } from "./graph";
import type { Document, Point } from "./model";
import { DocumentError, descendants, emptyDocument, parseDocument } from "./model";

const clipboardFormat = "flow-studio/selection";

export function copySelection(doc: Document, ids: readonly string[]): Document {
  const roots = selectionRoots(doc, ids);
  const included = new Set(roots.flatMap((n) => [n.id, ...descendants(doc, n.id)]));
  return {
    ...emptyDocument,
    nodes: doc.nodes
      .filter((n) => included.has(n.id))
      .map((n) => ({ ...n, parent: n.parent && included.has(n.parent) ? n.parent : null })),
    edges: doc.edges.filter((e) => included.has(e.source) && included.has(e.target)),
  };
}

export function serializeSelection(selection: Document): string {
  return JSON.stringify({ ...selection, format: clipboardFormat });
}

export function readSelection(text: string): Document {
  if (text.length > 5_000_000) throw new DocumentError("복사한 항목이 너무 큽니다.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new DocumentError("복사한 Flow Studio 항목이 없습니다.");
    throw error;
  }
  if (
    !value ||
    typeof value !== "object" ||
    !("format" in value) ||
    value.format !== clipboardFormat
  )
    throw new DocumentError("복사한 Flow Studio 항목이 없습니다.");
  return parseDocument({ ...value, format: "flow-studio" });
}

export function pasteSelection(
  doc: Document,
  selection: Document,
  destination: { readonly parent: string | null; readonly position: Point },
): { readonly doc: Document; readonly selected: string[] } {
  if (!selection.nodes.length) return { doc, selected: [] };
  if (
    doc.nodes.length + selection.nodes.length > 1000 ||
    doc.edges.length + selection.edges.length > 5000
  )
    throw new DocumentError("프로젝트 한도(항목 1,000개·연결 5,000개)를 초과합니다.");
  if (
    destination.parent &&
    !doc.nodes.some((n) => n.id === destination.parent && n.kind === "group")
  )
    throw new DocumentError("붙여넣을 그룹이 없습니다.");
  const roots = selection.nodes.filter((n) => !n.parent);
  const dx = destination.position.x - Math.min(...roots.map((n) => n.position.x));
  const dy = destination.position.y - Math.min(...roots.map((n) => n.position.y));
  const ids = new Map(selection.nodes.map((n) => [n.id, `n_${crypto.randomUUID()}`]));
  function mapped(id: string): string {
    const result = ids.get(id);
    if (!result) throw new DocumentError("복사한 항목의 연결 정보가 올바르지 않습니다.");
    return result;
  }
  const nodes = selection.nodes.map((n) => ({
    ...n,
    id: mapped(n.id),
    parent: n.parent ? mapped(n.parent) : destination.parent,
    position: { x: n.position.x + dx, y: n.position.y + dy },
    ...(n.ports
      ? {
          ports: n.ports.map((p) => ({
            ...p,
            id: `p_${crypto.randomUUID()}`,
            nodeId: mapped(p.nodeId),
          })),
        }
      : {}),
    ...(n.exposedSettings
      ? {
          exposedSettings: n.exposedSettings.map((s) => ({
            ...s,
            id: `s_${crypto.randomUUID()}`,
            nodeId: mapped(s.nodeId),
          })),
        }
      : {}),
  }));
  const edges = selection.edges.map((e) => ({
    ...e,
    id: `e_${crypto.randomUUID()}`,
    source: mapped(e.source),
    target: mapped(e.target),
  }));
  return {
    doc: { ...doc, nodes: [...doc.nodes, ...nodes], edges: [...doc.edges, ...edges] },
    selected: roots.map((n) => mapped(n.id)),
  };
}
