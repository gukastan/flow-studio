import type { Connection, Edge, ReactFlowInstance } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";
import type { Alignment } from "./alignment";
import { alignSelection, canAlign, canDistribute, distributeSelection } from "./alignment";
import type { FlowNode } from "./CanvasNode";
import { connectNodes, reconnectTargets } from "./connections";
import type { SettingChange } from "./exposedSettings";
import { updateSettingValue } from "./exposedSettings";
import { convertToSubgraph, groupSelection, removeItems, selectionRoots, ungroup } from "./graph";
import type { Document, Item, Link, Point } from "./model";
import { DocumentError, isSubgraph } from "./model";
import { createPlacedNode } from "./placement";
import { scopeDocument } from "./scopeGraph";
import { useCanvasView } from "./useCanvasView";
import { useClipboard } from "./useClipboard";
import { useDocument } from "./useDocument";
import { useNavigation } from "./useNavigation";
import { useProjectFiles } from "./useProjectFiles";
import { useShortcuts } from "./useShortcuts";
import { realEdgeIdsForVisible } from "./visibleEdges";
export function useWorkspace() {
  const history = useDocument();
  const { doc, commit, undo, redo } = history;
  const [selection, setSelected] = useState<string[]>([]);
  const [edgeIds, setEdgeIds] = useState<string[]>([]);
  const edgeId = edgeIds.length === 1 ? (edgeIds[0] ?? null) : null;
  const setEdgeId = useCallback((id: string | null) => setEdgeIds(id ? [id] : []), []);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [drawer, setDrawer] = useState<"outline" | "inspector" | null>(null);
  const [portsGroupId, setPortsGroupId] = useState<string | null>(null);
  const flow = useRef<ReactFlowInstance<FlowNode, Edge> | null>(null);
  const { fitCanvas, canvasCenter } = useCanvasView(flow);
  const rename = useCallback(
    (id: string, label: string) =>
      commit((d) => ({
        ...d,
        nodes: d.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
      })),
    [commit],
  );
  const toggle = useCallback(
    (id: string) =>
      commit((d) => ({
        ...d,
        nodes: d.nodes.map((n) => (n.id === id ? { ...n, collapsed: !n.collapsed } : n)),
      })),
    [commit],
  );
  const select = useCallback(
    (ids: string[]) => {
      setSelected(ids);
      setEdgeId(null);
      setPortsGroupId(null);
    },
    [setEdgeId],
  );
  const navigation = useNavigation({
    doc,
    flow,
    resetSelection: () => {
      select([]);
      setDrawer(null);
    },
  });
  const scope = navigation.scope?.id ?? null;
  const viewDoc = scopeDocument(doc, scope);
  const selected = selection.filter((id) => viewDoc.nodes.some((n) => n.id === id));
  function connect(
    source: string,
    target: string,
    handles?: Pick<Connection, "sourceHandle" | "targetHandle">,
  ) {
    try {
      commit(
        connectNodes(
          doc,
          {
            source,
            target,
            sourceHandle: handles?.sourceHandle ?? null,
            targetHandle: handles?.targetHandle ?? null,
          },
          scope,
        ),
      );
    } catch (error) {
      if (error instanceof DocumentError) setNotice(error.message);
      else throw error;
    }
  }
  function reconnectTarget(edgeId: string, target: string, targetHandle: string | null) {
    try {
      commit((current) =>
        reconnectTargets(
          current,
          realEdgeIdsForVisible(current, navigation.scope, [edgeId]),
          target,
          targetHandle,
          scope,
        ),
      );
    } catch (error) {
      if (error instanceof DocumentError) setNotice(error.message);
      else throw error;
    }
  }
  function disconnectTarget(edgeId: string) {
    commit((current) => {
      const removed = realEdgeIdsForVisible(current, navigation.scope, [edgeId]);
      return { ...current, edges: current.edges.filter((edge) => !removed.has(edge.id)) };
    });
    setEdgeId(null);
  }
  function openPorts(id: string) {
    setPortsGroupId(id);
    if (matchMedia("(max-width: 700px)").matches) setDrawer("inspector");
  }
  const remove = useCallback(() => {
    commit((d) => {
      const removedEdges = realEdgeIdsForVisible(d, navigation.scope, edgeIds);
      return removeItems({ ...d, edges: d.edges.filter((e) => !removedEdges.has(e.id)) }, selected);
    });
    setSelected([]);
    setEdgeId(null);
  }, [commit, edgeIds, navigation.scope, selected, setEdgeId]);
  const group = useCallback(() => {
    const roots = selectionRoots(doc, selected);
    if (roots.length === 1 && isSubgraph(roots[0])) {
      setNotice("서브그래프 풀기는 Ctrl+G를 사용하세요.");
      return;
    }
    const next = groupSelection(doc, selected);
    if (next === doc) {
      setNotice("같은 그룹에 속한 노드들을 선택해 주세요. 중첩 그룹도 함께 묶을 수 있습니다.");
      return;
    }
    commit(next);
    const added = next.nodes.find((n) => !doc.nodes.some((old) => old.id === n.id));
    const removed = doc.nodes.find((n) => !next.nodes.some((node) => node.id === n.id));
    setSelected(
      added ? [added.id] : doc.nodes.filter((n) => n.parent === removed?.id).map((n) => n.id),
    );
  }, [commit, doc, selected]);
  function subgraph() {
    const roots = selectionRoots(doc, selected);
    const existing = roots.length === 1 && isSubgraph(roots[0]) ? roots[0] : undefined;
    if (existing) {
      commit(ungroup(doc, existing.id));
      select(doc.nodes.filter((n) => n.parent === existing.id).map((n) => n.id));
      return;
    }
    const next = convertToSubgraph(doc, selected);
    if (next === doc) {
      const groupWire =
        doc.edges.some((e) => selected.includes(e.source) || selected.includes(e.target)) &&
        selected.some((id) => doc.nodes.find((n) => n.id === id)?.kind === "group");
      setNotice(
        groupWire
          ? "그룹 자체에 연결된 선은 내부 노드에 연결한 뒤 변환해 주세요."
          : "같은 그룹에 속한 항목을 선택해 주세요.",
      );
      return;
    }
    commit(next);
    const added = next.nodes.find((n) => !doc.nodes.some((old) => old.id === n.id));
    const converted = added ?? selectionRoots(next, selected)[0];
    if (converted) select([converted.id]);
  }
  function addNode(at?: Point) {
    if (doc.nodes.length >= 1000) {
      setNotice("항목은 최대 1,000개까지 추가할 수 있습니다.");
      return;
    }
    const center = canvasCenter();
    const node = createPlacedNode(doc, scope, at ?? { x: center.x - 112, y: center.y - 44 });
    commit((d) => ({ ...d, nodes: [...d.nodes, node] }));
    select([node.id]);
    void flow.current?.setCenter(node.position.x + 112, node.position.y + 44, {
      zoom: flow.current.getZoom(),
    });
  }
  const files = useProjectFiles({ replace, notice: setNotice });
  function align(direction: Alignment) {
    commit(alignSelection(doc, selected, direction));
    fitCanvas();
  }
  const clipboard = useClipboard({
    doc,
    selected,
    parent: scope,
    position: canvasCenter,
    commit,
    select,
    notice: setNotice,
  });
  useShortcuts({
    undo,
    redo,
    save: files.save,
    group,
    subgraph,
    remove,
    selectAll: () => select(viewDoc.nodes.map((n) => n.id)),
    escape: () => {
      if (navigation.scope) navigation.leave();
      else select([]);
      setDrawer(null);
    },
  });
  function replace(next: Document) {
    commit(next);
    setSelected([]);
    setEdgeId(null);
    navigation.navigate(null);
    setPortsGroupId(null);
    fitCanvas();
  }
  function patch(patchValue: Partial<Item>) {
    commit((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (selected.includes(n.id) ? { ...n, ...patchValue } : n)),
    }));
  }
  function edgePatch(id: string, patchValue: Partial<Link>) {
    commit((d) => {
      const patchedEdges = realEdgeIdsForVisible(d, navigation.scope, [id]);
      return {
        ...d,
        edges: d.edges.map((e) => (patchedEdges.has(e.id) ? { ...e, ...patchValue } : e)),
      };
    });
  }

  return {
    history,
    doc,
    commit,
    undo,
    redo,
    selected,
    setSelected,
    edgeId,
    setEdgeId,
    edgeIds,
    setEdgeIds,
    importing,
    setImporting,
    ...files,
    align,
    canAlign: canAlign(doc, selected),
    canDistribute: canDistribute(doc, selected),
    distribute: (direction: Alignment) => {
      commit(distributeSelection(doc, selected, direction));
      fitCanvas();
    },
    notice,
    setNotice,
    theme,
    setTheme,
    drawer,
    setDrawer,
    flow,
    fitCanvas,
    rename,
    toggle,
    connect,
    reconnectTarget,
    disconnectTarget,
    select,
    remove,
    group,
    subgraph,
    addNode,
    replace,
    patch,
    edgePatch,
    clipboard,
    navigation,
    viewDoc,
    portsGroupId,
    openPorts,
    closePorts: () => setPortsGroupId(null),
    changeSetting: (groupId: string, change: SettingChange) =>
      commit((d) => updateSettingValue(d, groupId, change)),
  };
}
