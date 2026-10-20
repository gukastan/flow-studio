import { useCallback, useState } from "react";
import type { MenuEntry, MenuRequest } from "./ContextMenu";
import { selectionRoots } from "./graph";
import { isSubgraph, PALETTE } from "./model";
import type { useWorkspace } from "./useWorkspace";

export function useCanvasMenu(workspace: ReturnType<typeof useWorkspace>) {
  const [request, setRequest] = useState<MenuRequest | null>(null);
  const close = useCallback(() => setRequest(null), []);
  function open(next: MenuRequest) {
    switch (next.target.kind) {
      case "nodes":
        workspace.select([...next.target.ids]);
        break;
      case "edge":
        workspace.select([]);
        workspace.setEdgeId(next.target.id);
        break;
      case "pane":
        workspace.select([]);
        break;
    }
    setRequest(next);
  }
  function properties() {
    if (matchMedia("(max-width: 700px)").matches) workspace.setDrawer("inspector");
    requestAnimationFrame(() => {
      const field = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
        ".inspector textarea, .inspector input:not([type=color]):not([type=checkbox])",
      );
      field?.focus();
      field?.select();
    });
  }
  let title = "캔버스";
  let entries: readonly MenuEntry[] = [];
  if (request) {
    switch (request.target.kind) {
      case "nodes": {
        const roots = selectionRoots(workspace.doc, request.target.ids);
        const single = roots.length === 1 ? roots[0] : undefined;
        const group = single?.kind === "group" ? single : undefined;
        const canGroup = roots.length > 0 && roots.every((n) => n.parent === roots[0]?.parent);
        title = single?.label || `${roots.length}개 항목 선택`;
        entries = [
          {
            label: "서브그래프로 변환",
            action: workspace.subgraph,
            disabled: !canGroup || isSubgraph(group),
          },
          ...(group && isSubgraph(group)
            ? [
                {
                  label: "서브그래프 내부 편집",
                  action: () => workspace.navigation.navigate(group.id),
                },
                { label: "입력·출력 편집", action: () => workspace.openPorts(group.id) },
              ]
            : []),
          ...(group && !isSubgraph(group)
            ? [
                {
                  label: group.collapsed ? "그룹 펼치기" : "그룹 접기",
                  action: () => workspace.toggle(group.id),
                },
              ]
            : []),
          {
            label: isSubgraph(group) ? "서브그래프 풀기" : group ? "그룹 해제" : "그룹화",
            action: workspace.group,
            disabled: !canGroup,
            shortcut: "⌘/Ctrl G",
          },
          { label: "복제", action: workspace.clipboard.duplicate, separator: true },
          {
            label: "복사",
            action: () => {
              void workspace.clipboard.copy();
            },
            shortcut: "⌘/Ctrl C",
          },
          {
            label: "붙여넣기",
            action: () => {
              void workspace.clipboard.paste();
            },
            shortcut: "⌘/Ctrl V",
          },
          {
            label: "이름 변경",
            action: properties,
            disabled: request.target.ids.length !== 1,
            separator: true,
          },
          { label: "속성", action: properties },
          {
            label: "색상",
            children: PALETTE.map((color) => ({
              label: color.name,
              color: color.value,
              action: () => workspace.patch({ color: color.value }),
            })),
          },
          {
            label: "노드 유형",
            disabled: roots.some((n) => n.kind === "group"),
            children: [
              { label: "프로세스", action: () => workspace.patch({ shape: "process" }) },
              { label: "조건 / 분기", action: () => workspace.patch({ shape: "decision" }) },
              { label: "시작 / 종료", action: () => workspace.patch({ shape: "terminal" }) },
            ],
          },
          {
            label: group ? "그룹과 내부 노드 삭제" : "선택 항목 삭제",
            action: workspace.remove,
            danger: true,
            separator: true,
          },
        ];
        break;
      }
      case "edge": {
        const id = request.target.id;
        const edge = workspace.doc.edges.find((e) => e.id === id);
        title = edge?.label || "연결선";
        entries = [
          { label: "연결 이름·속성", action: properties },
          {
            label: edge?.dashed ? "실선으로 변경" : "점선으로 변경",
            action: () => workspace.edgePatch(id, { dashed: !edge?.dashed }),
          },
          {
            label: edge?.arrow ? "화살표 숨기기" : "화살표 표시",
            action: () => workspace.edgePatch(id, { arrow: !edge?.arrow }),
          },
          { label: "연결 삭제", action: workspace.remove, danger: true, separator: true },
        ];
        break;
      }
      case "pane": {
        const point = request.point;
        entries = [
          {
            label: "붙여넣기",
            action: () => {
              void workspace.clipboard.paste(workspace.flow.current?.screenToFlowPosition(point));
            },
            shortcut: "⌘/Ctrl V",
          },
          {
            label: "노드 추가",
            action: () => workspace.addNode(workspace.flow.current?.screenToFlowPosition(point)),
          },
          { label: "Mermaid 붙여넣기", action: () => workspace.setImporting(true) },
          { label: "전체 보기", action: workspace.fitCanvas, separator: true },
          {
            label: "되돌리기",
            action: workspace.undo,
            disabled: !workspace.history.canUndo,
            shortcut: "⌘/Ctrl Z",
          },
          { label: "다시 실행", action: workspace.redo, disabled: !workspace.history.canRedo },
        ];
        break;
      }
    }
  }
  return { request, title, entries, open, close };
}
