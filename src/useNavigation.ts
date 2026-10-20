import type { Edge, ReactFlowInstance, Viewport } from "@xyflow/react";
import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FlowNode } from "./CanvasNode";
import type { Document } from "./model";
import { ancestors, isSubgraph } from "./model";
import { scopeGraph } from "./scopeGraph";

type Options = {
  readonly doc: Document;
  readonly flow: RefObject<ReactFlowInstance<FlowNode, Edge> | null>;
  readonly resetSelection: () => void;
};
export function useNavigation({ doc, flow, resetSelection }: Options) {
  const [scopeId, setScopeId] = useState<string | null>(null);
  const scope = doc.nodes.find((n) => n.id === scopeId && isSubgraph(n)) ?? null;
  const cameras = useRef(new Map<string | null, Viewport>());
  const latest = useRef(doc);
  useLayoutEffect(() => {
    latest.current = doc;
  }, [doc]);
  const path = scope
    ? [...ancestors(doc, scope.id).reverse(), scope.id].flatMap((id) =>
        doc.nodes.filter((n) => n.id === id && isSubgraph(n)),
      )
    : [];
  function navigate(id: string | null) {
    if (id === scope?.id || (id && !doc.nodes.some((n) => n.id === id && isSubgraph(n)))) return;
    const instance = flow.current;
    if (instance) cameras.current.set(scope?.id ?? null, instance.getViewport());
    resetSelection();
    setScopeId(id);
  }
  const scopeKey = scope?.id ?? null;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const instance = flow.current;
      if (!instance) return;
      const camera = cameras.current.get(scopeKey);
      if (camera) void instance.setViewport(camera);
      else {
        const current = latest.current;
        const group = current.nodes.find((n) => n.id === scopeKey) ?? null;
        const nodes = scopeGraph(current, group).nodes;
        if (!nodes.length) return;
        const left = Math.min(...nodes.map((n) => n.position.x));
        const top = Math.min(...nodes.map((n) => n.position.y));
        const right = Math.max(
          ...nodes.map((n) => n.position.x + (n.collapsed && !isSubgraph(n) ? 224 : n.width)),
        );
        const bottom = Math.max(
          ...nodes.map((n) => n.position.y + (n.collapsed && !isSubgraph(n) ? 88 : n.height)),
        );
        void instance.fitBounds(
          { x: left, y: top, width: right - left, height: bottom - top },
          { padding: 0.18 },
        );
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [scopeKey, flow]);
  function leave() {
    navigate(path.at(-2)?.id ?? null);
  }
  return { scope, path, navigate, leave };
}
