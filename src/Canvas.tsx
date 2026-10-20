import type { Connection, Edge, EdgeChange, NodeChange, ReactFlowInstance } from "@xyflow/react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  SelectionMode,
} from "@xyflow/react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { FlowNode } from "./CanvasNode";
import { CanvasNode } from "./CanvasNode";
import type { MenuRequest, MenuTarget } from "./ContextMenu";
import type { SettingChange } from "./exposedSettings";
import { GraphEdge } from "./GraphEdge";
import type { Document, Item, Point } from "./model";
import { isSubgraph } from "./model";
import { useCanvasGraph } from "./useCanvasGraph";

const nodeTypes = { card: CanvasNode };
const edgeTypes = { flow: GraphEdge };
const initialFit = { padding: 0.18, maxZoom: 1 };
type Props = {
  doc: Document;
  scope: Item | null;
  children: ReactNode;
  onEnter: (id: string) => void;
  onPorts: () => void;
  onSetting: (groupId: string, change: SettingChange) => void;
  selected: readonly string[];
  edgeIds: readonly string[];
  theme: "light" | "dark";
  onSelect: (ids: string[]) => void;
  onNodeSelection: (ids: string[]) => void;
  onSelectEdges: (ids: string[]) => void;
  onSelectEdge: (id: string | null) => void;
  onRename: (id: string, label: string) => void;
  onToggle: (id: string) => void;
  onConnect: (connection: Connection) => void;
  onMove: (positions: ReadonlyMap<string, Point>) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onReady: (instance: ReactFlowInstance<FlowNode, Edge>) => void;
  onMenu: (request: MenuRequest) => void;
  onCloseMenu: () => void;
};
export function Canvas(props: Props) {
  const { doc, selected, onSelect, onMove } = props;
  const { nodes, edges, boundaries, onMeasurements } = useCanvasGraph(props);
  function onNodesChange(changes: NodeChange<FlowNode>[]) {
    onMeasurements(changes);
    const positions = new Map<string, Point>();
    let selection = [...selected];
    let selectionChanged = false;
    for (const change of changes) {
      if (change.type === "position" && change.position) positions.set(change.id, change.position);
      if (change.type === "select") {
        selectionChanged = true;
        selection = change.selected
          ? [...new Set([...selection, change.id])]
          : selection.filter((id) => id !== change.id);
      }
    }
    if (positions.size) onMove(positions);
    if (selectionChanged) props.onNodeSelection(selection);
  }
  function onEdgesChange(changes: EdgeChange[]) {
    let selection = [...props.edgeIds];
    for (const change of changes) {
      if (change.type !== "select") continue;
      selection = change.selected
        ? [...new Set([...selection, change.id])]
        : selection.filter((id) => id !== change.id);
    }
    props.onSelectEdges(selection);
  }
  function selectEdge(id: string, extend: boolean) {
    const ids = extend ? [...new Set([...props.edgeIds, id])] : [id];
    onSelect([]);
    props.onSelectEdges(ids);
  }
  function openMenu(event: MouseEvent | ReactMouseEvent, target: MenuTarget) {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("input, textarea, [contenteditable=true]")
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    props.onMenu({ point: { x: event.clientX, y: event.clientY }, target });
  }
  return (
    <main
      className="canvas-region"
      aria-label="흐름도 편집 캔버스"
      tabIndex={-1}
      onPointerDownCapture={(event) => {
        if (event.button !== 0) return;
        const edge =
          event.target instanceof Element ? event.target.closest(".react-flow__edge") : null;
        const id = edge?.getAttribute("data-id");
        if (!id) {
          if (event.target instanceof Element && event.target.closest(".react-flow__node"))
            props.onSelectEdge(null);
          return;
        }
        selectEdge(id, event.shiftKey || event.metaKey || event.ctrlKey);
        event.currentTarget.focus({ preventScroll: true });
      }}
      onKeyDown={(event) => {
        if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
        if (!(event.target instanceof HTMLElement) || event.target.closest("input, textarea"))
          return;
        event.preventDefault();
        const node = event.target.closest<HTMLElement>(".react-flow__node");
        const id = node?.getAttribute("data-id");
        if (id && boundaries.has(id)) {
          props.onPorts();
          return;
        }
        const ids = id && !selected.includes(id) ? [id] : selected;
        const bounds = (node ?? event.currentTarget).getBoundingClientRect();
        props.onMenu({
          point: { x: bounds.x + 24, y: bounds.y + 24 },
          target: ids.length ? { kind: "nodes", ids } : { kind: "pane" },
        });
      }}
    >
      {props.children}
      <ReactFlow<FlowNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={props.onConnect}
        connectionDragThreshold={0}
        connectionLineStyle={{ stroke: "var(--accent)", strokeWidth: 2.5 }}
        onInit={props.onReady}
        onNodeDragStart={props.onDragStart}
        onNodeDragStop={props.onDragEnd}
        onSelectionDragStart={props.onDragStart}
        onSelectionDragStop={props.onDragEnd}
        onEdgeClick={(event, edge) =>
          selectEdge(edge.id, event.shiftKey || event.metaKey || event.ctrlKey)
        }
        onPaneClick={() => {
          onSelect([]);
          props.onSelectEdge(null);
        }}
        onNodeClick={(_, node) => {
          if (boundaries.has(node.id)) props.onPorts();
          else props.onSelectEdge(null);
        }}
        onNodeDoubleClick={(event, node) => {
          if (
            isSubgraph(node.data.item) &&
            !(event.target instanceof Element && event.target.closest("button, input, textarea"))
          )
            props.onEnter(node.id);
        }}
        onNodeContextMenu={(event, node) => {
          if (boundaries.has(node.id)) {
            event.preventDefault();
            props.onPorts();
            return;
          }
          openMenu(event, {
            kind: "nodes",
            ids: selected.includes(node.id) ? selected : [node.id],
          });
        }}
        onSelectionContextMenu={(event) => openMenu(event, { kind: "nodes", ids: selected })}
        onEdgeContextMenu={(event, edge) => {
          openMenu(event, { kind: "edge", id: edge.id });
        }}
        onPaneContextMenu={(event) => openMenu(event, { kind: "pane" })}
        onMoveStart={props.onCloseMenu}
        fitView
        fitViewOptions={initialFit}
        minZoom={0.08}
        maxZoom={2}
        deleteKeyCode={null}
        elevateNodesOnSelect={false}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1]}
        panActivationKeyCode="Space"
        selectionKeyCode="Shift"
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        colorMode={props.theme}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="var(--grid)" />
        <Controls showInteractive={false} />
        <MiniMap<FlowNode>
          nodeColor={(n) => n.data.item.color}
          maskColor="var(--minimap-mask)"
          pannable
          zoomable
          className="minimap"
          ariaLabel="흐름도 미니맵"
        />
      </ReactFlow>
      {!doc.nodes.length && !props.scope && (
        <div className="empty-canvas">
          <h2>첫 번째 생각을 놓아 보세요</h2>
          <p>노드를 추가하거나 Mermaid 코드를 붙여넣어 시작하세요.</p>
        </div>
      )}
      <div className="canvas-hint">
        드래그로 선택 <span>·</span> Space + 드래그로 이동 <span>·</span> 우클릭으로 편집
      </div>
    </main>
  );
}
