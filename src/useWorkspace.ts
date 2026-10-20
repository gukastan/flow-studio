import type { Connection, Edge, ReactFlowInstance } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";
import type { FlowNode } from "./CanvasNode";
import { connectNodes } from "./connections";
import type { SettingChange } from "./exposedSettings";
import { updateSettingValue } from "./exposedSettings";
import { convertToSubgraph, groupSelection, removeItems, selectionRoots } from "./graph";
import type { Document, Item, Link, Point } from "./model";
import { DocumentError } from "./model";
import { createPlacedNode } from "./placement";
import { scopeDocument } from "./scopeGraph";
import { download, readProject } from "./storage";
import { useCanvasView } from "./useCanvasView";
import { useClipboard } from "./useClipboard";
import { useDocument } from "./useDocument";
import { useNavigation } from "./useNavigation";
import { useShortcuts } from "./useShortcuts";
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
  const file = useRef<HTMLInputElement>(null);
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
  function openPorts(id: string) {
    setPortsGroupId(id);
    if (matchMedia("(max-width: 700px)").matches) setDrawer("inspector");
  }
  const remove = useCallback(() => {
    commit((d) =>
      removeItems({ ...d, edges: d.edges.filter((e) => !edgeIds.includes(e.id)) }, selected),
    );
    setSelected([]);
    setEdgeId(null);
  }, [commit, edgeIds, selected, setEdgeId]);
  const group = useCallback(() => {
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
  const save = useCallback(() => {
    download(doc);
    setNotice("프로젝트 파일을 다운로드했습니다. ‘불러오기’로 다시 열 수 있습니다.");
  }, [doc]);
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
    save,
    group,
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
  async function loadFile(chosen: File) {
    try {
      replace(await readProject(chosen));
      setNotice("프로젝트의 위치, 색상, 그룹과 접힌 상태를 불러왔습니다.");
    } catch (error) {
      setNotice(
        error instanceof Error ? `불러오기 실패: ${error.message}` : "파일을 읽을 수 없습니다.",
      );
    }
  }
  function patch(patchValue: Partial<Item>) {
    commit((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (selected.includes(n.id) ? { ...n, ...patchValue } : n)),
    }));
  }
  function edgePatch(id: string, patchValue: Partial<Link>) {
    commit((d) => ({
      ...d,
      edges: d.edges.map((e) => (e.id === id ? { ...e, ...patchValue } : e)),
    }));
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
    notice,
    setNotice,
    theme,
    setTheme,
    drawer,
    setDrawer,
    flow,
    file,
    fitCanvas,
    rename,
    toggle,
    connect,
    select,
    remove,
    group,
    subgraph,
    addNode,
    save,
    replace,
    loadFile,
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
