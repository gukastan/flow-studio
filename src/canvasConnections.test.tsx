import type { Edge, ReactFlowProps } from "@xyflow/react";
import { act, useState } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Canvas } from "./Canvas";
import type { FlowNode } from "./CanvasNode";
import { newNode } from "./model";

vi.mock("@xyflow/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@xyflow/react")>()),
  Background: () => null,
  Controls: () => null,
  MiniMap: () => null,
  ReactFlow: ({ nodes, onNodesChange }: ReactFlowProps<FlowNode, Edge>) => (
    <>
      <button
        type="button"
        id="measure"
        onClick={() =>
          onNodesChange?.([{ id: "a", type: "dimensions", dimensions: { width: 224, height: 88 } }])
        }
      >
        Measure rendered node
      </button>
      <output id="measured">{JSON.stringify(nodes?.find((n) => n.id === "a")?.measured)}</output>
      <div className="react-flow__node">
        <div className="react-flow__handle" id="handle" />
      </div>
    </>
  ),
}));

const doc = {
  format: "flow-studio" as const,
  version: 1 as const,
  title: "Connection fixture",
  nodes: [{ ...newNode({ x: 0, y: 0 }), id: "a" }],
  edges: [],
};
function Harness() {
  const [edgeIds, setEdgeIds] = useState<string[]>(["wire"]);
  return (
    <Canvas
      doc={doc}
      scope={null}
      selected={[]}
      edgeIds={edgeIds}
      theme="dark"
      onSelectEdge={(id) => setEdgeIds(id ? [id] : [])}
      onSelectEdges={setEdgeIds}
      onSelect={vi.fn()}
      onNodeSelection={vi.fn()}
      onEnter={vi.fn()}
      onPorts={vi.fn()}
      onSetting={vi.fn()}
      onRename={vi.fn()}
      onToggle={vi.fn()}
      onConnect={vi.fn()}
      onMove={vi.fn()}
      onDragStart={vi.fn()}
      onDragEnd={vi.fn()}
      onReady={vi.fn()}
      onMenu={vi.fn()}
      onCloseMenu={vi.fn()}
      onFile={vi.fn()}
    >
      <button type="button" id="rerender" onClick={() => setEdgeIds([])}>
        Change selection
      </button>
    </Canvas>
  );
}

let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<Harness />));
});
afterEach(() => {
  act(() => root.unmount());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it("retains measured node dimensions when pointer-down clears a wire selection", () => {
  act(() => document.getElementById("measure")?.click());
  act(() =>
    document
      .getElementById("handle")
      ?.dispatchEvent(new MouseEvent("pointerdown", { button: 0, bubbles: true })),
  );
  expect(document.getElementById("measured")?.textContent).toBe('{"width":224,"height":88}');
  act(() => document.getElementById("rerender")?.click());
  expect(document.getElementById("measured")?.textContent).toBe('{"width":224,"height":88}');
});
