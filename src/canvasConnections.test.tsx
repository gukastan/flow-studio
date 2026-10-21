import type { Edge, FinalConnectionState, ReactFlowProps } from "@xyflow/react";
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
  ReactFlow: ({
    nodes,
    edges,
    onNodesChange,
    onReconnect,
    onReconnectStart,
    onReconnectEnd,
  }: ReactFlowProps<FlowNode, Edge>) => (
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
      <output id="reconnectable">{String(edges?.[0]?.reconnectable)}</output>
      <button
        type="button"
        id="move-wire"
        onClick={() => {
          const edge = edges?.[0];
          if (edge)
            onReconnect?.(edge, {
              source: "a",
              sourceHandle: "out",
              target: "c",
              targetHandle: "in-top",
            });
        }}
      >
        Move wire
      </button>
      <button
        type="button"
        id="drop-wire"
        onMouseDown={(event) => {
          const edge = edges?.[0];
          if (edge) onReconnectStart?.(event, edge, "source");
        }}
        onMouseUp={(event) => {
          const edge = edges?.[0];
          if (edge) onReconnectEnd?.(event.nativeEvent, edge, "source", emptyDrop);
        }}
      >
        Drop wire
      </button>
      <div className="react-flow__node">
        <div className="react-flow__handle" id="handle" />
      </div>
    </>
  ),
}));

const emptyDrop: FinalConnectionState = {
  isValid: null,
  from: null,
  fromHandle: null,
  fromPosition: null,
  fromNode: null,
  to: null,
  toHandle: null,
  toPosition: null,
  toNode: null,
  pointer: null,
};
const reconnect = vi.fn();
const disconnect = vi.fn();
const doc = {
  format: "flow-studio" as const,
  version: 1 as const,
  title: "Connection fixture",
  nodes: ["a", "b", "c"].map((id, index) => ({
    ...newNode({ x: index * 300, y: 0 }),
    id,
  })),
  edges: [{ id: "wire", source: "a", target: "b", label: "", dashed: false, arrow: true }],
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
      onReconnectTarget={reconnect}
      onDisconnectTarget={disconnect}
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
  reconnect.mockClear();
  disconnect.mockClear();
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

it("moves only the selected wire's target when React Flow reconnects its arrow end", () => {
  expect(document.getElementById("reconnectable")?.textContent).toBe("target");
  act(() => document.getElementById("move-wire")?.click());
  expect(reconnect).toHaveBeenCalledWith("wire", "c", "in-top");
});

it("disconnects after dragging the arrow end to empty space, but not after a click", () => {
  const button = document.getElementById("drop-wire");
  if (!button) throw new Error("Missing drop control");
  act(() => {
    button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 10, clientY: 10 }));
    button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 10, clientY: 10 }));
  });
  expect(disconnect).not.toHaveBeenCalled();
  act(() => {
    button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 10, clientY: 10 }));
    button.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 100, clientY: 10 }));
  });
  expect(disconnect).toHaveBeenCalledOnce();
  expect(disconnect).toHaveBeenCalledWith("wire");
});
