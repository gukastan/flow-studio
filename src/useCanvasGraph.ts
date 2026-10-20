import type { Edge, NodeChange } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { useMemo, useState } from "react";
import type { FlowNode } from "./CanvasNode";
import type { SettingChange } from "./exposedSettings";
import { resolveSettings } from "./exposedSettings";
import type { Document, Item } from "./model";
import { ancestors, descendants, isSubgraph } from "./model";
import type { RouteBox } from "./sameSideRoute";
import { scopeGraph } from "./scopeGraph";

type Options = {
  readonly doc: Document;
  readonly scope: Item | null;
  readonly selected: readonly string[];
  readonly edgeIds: readonly string[];
  readonly onRename: (id: string, label: string) => void;
  readonly onToggle: (id: string) => void;
  readonly onEnter: (id: string) => void;
  readonly onPorts: () => void;
  readonly onSetting: (groupId: string, change: SettingChange) => void;
};
export function useCanvasGraph(options: Options) {
  const { doc, scope, selected, edgeIds, onRename, onToggle, onEnter, onPorts } = options;
  const graph = useMemo(() => scopeGraph(doc, scope), [doc, scope]);
  const [measurements, setMeasurements] = useState(
    () => new Map<string, { width: number; height: number }>(),
  );
  function onMeasurements(changes: NodeChange<FlowNode>[]) {
    if (!changes.some((change) => change.type === "dimensions" && change.dimensions)) return;
    setMeasurements((current) => {
      const visibleIds = new Set(graph.nodes.map((node) => node.id));
      const next = new Map([...current].filter(([id]) => visibleIds.has(id)));
      for (const change of changes) {
        if (change.type === "dimensions" && change.dimensions)
          next.set(change.id, change.dimensions);
      }
      return next;
    });
  }
  const nodes: FlowNode[] = [...graph.nodes]
    .sort((a, b) => ancestors(doc, a.id).length - ancestors(doc, b.id).length)
    .map((item) => {
      const frame = item.kind === "group" && !item.collapsed && !isSubgraph(item);
      const boundary = graph.boundaries.get(item.id);
      const folded = item.collapsed && !isSubgraph(item);
      const measured = measurements.get(item.id);
      return {
        id: item.id,
        type: "card",
        position: item.position,
        width: folded ? 224 : item.width,
        height: folded ? 88 : item.height,
        ...(measured ? { measured } : {}),
        selected: selected.includes(item.id),
        selectable: !boundary,
        draggable: !boundary,
        zIndex: frame ? 1 + ancestors(doc, item.id).length : 10,
        style: { pointerEvents: frame ? "none" : "auto" },
        dragHandle: ".card-header",
        data: {
          item,
          count: descendants(doc, item.id).size,
          onRename,
          onToggle,
          onEnter: boundary ? onPorts : onEnter,
          settings: boundary ? [] : resolveSettings(doc, item),
          onSetting: options.onSetting,
          ...(boundary ? { boundary } : {}),
        },
        ariaLabel:
          `${boundary ? "" : isSubgraph(item) ? "서브그래프" : item.kind === "group" ? "그룹" : "노드"} ${item.label}`.trim(),
      };
    });
  const boxes: RouteBox[] = nodes
    .filter(
      (node) =>
        node.data.item.kind !== "group" || node.data.item.collapsed || isSubgraph(node.data.item),
    )
    .map((node) => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: node.measured?.width ?? node.width ?? 224,
      height: node.measured?.height ?? node.height ?? 88,
    }));
  const selectedEdges = new Set(edgeIds);
  const edges: Edge[] = graph.edges.map((edge, index) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label,
    type: "flow",
    data: {
      boxes,
      lane: graph.edges
        .slice(0, index)
        .filter(
          (e) =>
            e.source === edge.source &&
            e.target === edge.target &&
            e.sourceHandle === edge.sourceHandle &&
            e.targetHandle === edge.targetHandle,
        ).length,
    },
    selected: selectedEdges.has(edge.id),
    ...(edge.arrow
      ? {
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: selectedEdges.has(edge.id) ? "var(--accent)" : "var(--edge-arrow)",
            width: 20,
            height: 20,
          },
        }
      : {}),
    style: {
      strokeWidth: selectedEdges.has(edge.id) ? 3 : 2.2,
      strokeDasharray: edge.dashed ? "6 5" : undefined,
    },
    interactionWidth: 24,
  }));
  return { nodes, edges, boundaries: graph.boundaries, slots: graph.slots, onMeasurements };
}
