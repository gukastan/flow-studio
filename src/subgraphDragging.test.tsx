import { ReactFlowProvider } from "@xyflow/react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convertToSubgraph } from "./graph";
import { SubgraphCard } from "./SubgraphCard";
import { starter } from "./sample";
import { useCanvasGraph } from "./useCanvasGraph";

const doc = convertToSubgraph(starter, ["g"]);
function Harness({ inner = false }: { readonly inner?: boolean }) {
  const { nodes } = useCanvasGraph({
    doc,
    scope: inner ? (doc.nodes.find((n) => n.id === "g") ?? null) : null,
    selected: ["g"],
    edgeIds: [],
    onRename: vi.fn(),
    onToggle: vi.fn(),
    onEnter: vi.fn(),
    onPorts: vi.fn(),
    onSetting: vi.fn(),
  });
  return nodes
    .filter((n) => n.id === "g" || n.data.boundary)
    .map((node) => (
      <div
        key={node.id}
        id={node.id}
        data-drag-handle={node.dragHandle}
        data-draggable={node.draggable}
        data-selectable={node.selectable}
      >
        <div className="graph-card subgraph-card">
          <SubgraphCard
            item={node.data.item}
            onEnter={node.data.onEnter}
            onSetting={node.data.onSetting}
            settings={[
              {
                setting: { id: "name", nodeId: "b", property: "label", label: "초안 이름" },
                value: "초안 작성",
              },
            ]}
            {...(node.data.boundary ? { boundary: node.data.boundary } : {})}
          />
        </div>
      </div>
    ));
}

let root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <ReactFlowProvider>
        <Harness />
      </ReactFlowProvider>,
    ),
  );
});
afterEach(() => {
  act(() => root.unmount());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it("allows a converted subgraph to be dragged from its title, slot labels and empty body", () => {
  const node = document.getElementById("g");
  const dragHandle = node?.getAttribute("data-drag-handle");
  if (!node || !dragHandle) throw new Error("Expected rendered subgraph");
  expect(node.getAttribute("data-draggable")).toBe("true");
  for (const selector of [".subgraph-name", ".slot-label", ".subgraph-slots", ".subgraph-card"]) {
    expect(node.querySelector(selector)?.closest(dragHandle)).toBeTruthy();
  }
  for (const selector of ["button", ".react-flow__handle", "input"]) {
    expect(node.querySelector(selector)?.closest(".nodrag")).toBeTruthy();
  }
});

it("lets both boundary cards move from their body without becoming selectable graph nodes", () => {
  act(() =>
    root.render(
      <ReactFlowProvider>
        <Harness inner />
      </ReactFlowProvider>,
    ),
  );
  const boundaries = document.querySelectorAll("[data-draggable]");
  expect(boundaries).toHaveLength(2);
  for (const node of boundaries) {
    const dragHandle = node.getAttribute("data-drag-handle");
    if (!dragHandle) throw new Error("Expected boundary drag handle");
    expect(node.getAttribute("data-draggable")).toBe("true");
    expect(node.getAttribute("data-selectable")).toBe("false");
    for (const selector of [".subgraph-name", ".slot-label", ".subgraph-slots"])
      expect(node.querySelector(selector)?.closest(dragHandle)).toBeTruthy();
    expect(node.querySelector(".react-flow__handle")?.closest(".nodrag")).toBeTruthy();
  }
});
