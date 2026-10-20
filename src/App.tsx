import { CheckCircle2, X } from "lucide-react";
import { Canvas } from "./Canvas";
import { CanvasBreadcrumb } from "./CanvasBreadcrumb";
import { ContextMenu } from "./ContextMenu";
import { fitGroups, moveItems, selectionRoots, visibleRepresentative } from "./graph";
import { ImportDialog } from "./ImportDialog";
import { Inspector } from "./Inspector";
import { autoLayout } from "./layout";
import { isSubgraph } from "./model";
import { Outline } from "./Outline";
import { StatusBar } from "./StatusBar";
import { SubgraphPanel } from "./SubgraphPanel";
import { Toolbar } from "./Toolbar";
import { useCanvasMenu } from "./useCanvasMenu";
import { useWorkspace } from "./useWorkspace";
export function App() {
  const workspace = useWorkspace();
  const menu = useCanvasMenu(workspace);
  const {
    history,
    doc,
    commit,
    undo,
    redo,
    selected,
    edgeId,
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
    addNode,
    save,
    replace,
    loadFile,
    patch,
    edgePatch,
    setEdgeId,
  } = workspace;
  const roots = selectionRoots(doc, selected);
  const isGroup = roots.length === 1 && roots[0]?.kind === "group";
  const navigation = workspace.navigation;
  const portsGroup = doc.nodes.find((n) => n.id === workspace.portsGroupId && isSubgraph(n));
  return (
    <div className={`app ${drawer ? `show-${drawer}` : ""}`} data-theme={theme}>
      <Toolbar
        title={doc.title}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        selectedCount={selected.length}
        isGroup={isGroup}
        isSubgraph={isGroup && isSubgraph(roots[0])}
        theme={theme}
        onTitle={(title) => {
          if (title !== doc.title) commit({ ...doc, title });
        }}
        onImport={() => setImporting(true)}
        onSave={save}
        onLoad={() => file.current?.click()}
        onAdd={() => addNode()}
        onGroup={group}
        onActions={(point) =>
          menu.open({
            point,
            target: selected.length
              ? { kind: "nodes", ids: selected }
              : edgeId
                ? { kind: "edge", id: edgeId }
                : { kind: "pane" },
          })
        }
        onLayout={() => {
          commit(autoLayout(doc, "LR", navigation.scope?.id ?? null));
          fitCanvas();
        }}
        onFit={fitCanvas}
        onUndo={undo}
        onRedo={redo}
        onTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onOutline={() => setDrawer(drawer === "outline" ? null : "outline")}
        onInspector={() => setDrawer(drawer === "inspector" ? null : "inspector")}
      />
      <div className="workspace" id="canvas">
        {drawer && (
          <button
            type="button"
            className="drawer-scrim"
            aria-label="패널 닫기"
            onClick={() => setDrawer(null)}
          />
        )}
        <Outline
          doc={workspace.viewDoc}
          selected={selected}
          onSelect={select}
          onToggle={toggle}
          onEnter={navigation.navigate}
          onFocus={(id) => {
            const visible = visibleRepresentative(doc, id, navigation.scope?.id ?? null);
            const node = doc.nodes.find((n) => n.id === visible);
            if (node?.kind === "group" && !node.collapsed && !isSubgraph(node)) {
              void flow.current?.fitBounds(
                { ...node.position, width: node.width, height: node.height },
                { padding: 0.15 },
              );
              return;
            }
            if (node)
              void flow.current?.setCenter(
                node.position.x + (node.collapsed ? 224 : node.width) / 2,
                node.position.y + (node.collapsed && !isSubgraph(node) ? 88 : node.height) / 2,
                { zoom: 1 },
              );
          }}
        />
        <Canvas
          doc={doc}
          scope={navigation.scope}
          onEnter={navigation.navigate}
          onPorts={() => {
            if (navigation.scope) workspace.openPorts(navigation.scope.id);
          }}
          onSetting={workspace.changeSetting}
          selected={selected}
          edgeIds={workspace.edgeIds}
          theme={theme}
          onSelect={select}
          onNodeSelection={workspace.setSelected}
          onSelectEdges={workspace.setEdgeIds}
          onSelectEdge={setEdgeId}
          onRename={rename}
          onToggle={toggle}
          onConnect={(c) => connect(c.source, c.target, c)}
          onMove={(positions) => history.drag((d) => moveItems(d, positions))}
          onDragStart={history.startDrag}
          onDragEnd={history.endDrag}
          onReady={(instance) => {
            flow.current = instance;
          }}
          onMenu={menu.open}
          onCloseMenu={menu.close}
        >
          <CanvasBreadcrumb
            path={navigation.path}
            onNavigate={navigation.navigate}
            onLeave={navigation.leave}
            onPorts={() => {
              if (navigation.scope) workspace.openPorts(navigation.scope.id);
            }}
          />
        </Canvas>
        {portsGroup ? (
          <SubgraphPanel
            doc={doc}
            group={portsGroup}
            onCommit={commit}
            onClose={workspace.closePorts}
          />
        ) : (
          <Inspector
            doc={doc}
            selected={selected}
            edgeId={edgeId}
            onPatch={patch}
            onEdgePatch={edgePatch}
            onDelete={remove}
            onGroup={group}
            onUngroup={group}
            onToggle={toggle}
            onEnter={navigation.navigate}
            onPorts={workspace.openPorts}
            connectable={workspace.viewDoc.nodes}
            onConnect={connect}
            onReparent={(id, parent) =>
              commit(
                fitGroups({
                  ...doc,
                  nodes: doc.nodes.map((n) => (n.id === id ? { ...n, parent } : n)),
                }),
              )
            }
          />
        )}
      </div>
      <StatusBar doc={doc} warning={history.warning} />
      {menu.request && (
        <ContextMenu
          key={`${menu.request.point.x},${menu.request.point.y},${menu.title}`}
          point={menu.request.point}
          title={menu.title}
          entries={menu.entries}
          onClose={menu.close}
        />
      )}
      {notice && (
        <div className="notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setNotice("")}
            aria-label="알림 닫기"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <input
        ref={file}
        type="file"
        accept=".json,.flow.json,application/json"
        className="sr-only"
        aria-label="프로젝트 파일 선택"
        onChange={(e) => {
          const chosen = e.target.files?.[0];
          if (chosen) void loadFile(chosen);
          e.target.value = "";
        }}
      />
      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onImport={(next) => {
            replace(next);
            setNotice(`${next.nodes.length}개 항목을 가져왔습니다. 자유롭게 편집해 보세요.`);
          }}
        />
      )}
    </div>
  );
}
