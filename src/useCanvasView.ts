import type { Edge, ReactFlowInstance } from "@xyflow/react";
import type { RefObject } from "react";
import { useCallback } from "react";
import type { FlowNode } from "./CanvasNode";
import type { Point } from "./model";

export function useCanvasView(flow: RefObject<ReactFlowInstance<FlowNode, Edge> | null>) {
  const fitCanvas = useCallback(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const instance = flow.current;
        if (!instance) return;
        void instance.fitBounds(instance.getNodesBounds(instance.getNodes()), {
          padding: 0.18,
          duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200,
        });
      }),
    );
  }, [flow]);
  function canvasCenter(): Point {
    const bounds = document.querySelector(".canvas-region")?.getBoundingClientRect();
    return bounds && flow.current
      ? flow.current.screenToFlowPosition({
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
        })
      : { x: 200, y: 200 };
  }
  return { fitCanvas, canvasCenter };
}
