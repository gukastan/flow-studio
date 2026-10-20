import {
  Code2,
  Download,
  FolderOpen,
  Group,
  LayoutGrid,
  Maximize,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Redo2,
  SlidersHorizontal,
  Sun,
  Undo2,
  Ungroup,
  Workflow,
} from "lucide-react";
import type { Point } from "./model";

type Props = {
  title: string;
  canUndo: boolean;
  canRedo: boolean;
  selectedCount: number;
  isGroup: boolean;
  isSubgraph: boolean;
  theme: "light" | "dark";
  onTitle: (title: string) => void;
  onImport: () => void;
  onSave: () => void;
  onLoad: () => void;
  onAdd: () => void;
  onGroup: () => void;
  onLayout: () => void;
  onFit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onTheme: () => void;
  onOutline: () => void;
  onInspector: () => void;
  onActions: (point: Point) => void;
};
export function Toolbar(p: Props) {
  return (
    <>
      <header className="app-header">
        <a className="brand" href="#canvas" aria-label="Flow Studio 캔버스">
          <Workflow size={25} />
          <span>
            flow<span className="brand-light">studio</span>
          </span>
        </a>
        <div className="header-divider" />
        <input
          className="project-title"
          aria-label="프로젝트 이름"
          key={p.title}
          defaultValue={p.title}
          maxLength={200}
          onBlur={(e) => p.onTitle(e.target.value.trim() || "이름 없는 흐름")}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            onClick={p.onTheme}
            aria-label={p.theme === "dark" ? "밝은 테마" : "어두운 테마"}
            title="테마 변경"
          >
            {p.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            onClick={p.onLoad}
            title="프로젝트 JSON 파일 불러오기"
            aria-label="불러오기"
          >
            <FolderOpen size={16} />
            <span>불러오기</span>
          </button>
          <button type="button" className="primary" onClick={p.onSave} aria-label="저장">
            <Download size={16} />
            <span>저장</span>
          </button>
        </div>
      </header>
      <nav className="toolbar" aria-label="편집 도구">
        <button
          type="button"
          className="icon-button mobile-outline"
          onClick={p.onOutline}
          title="구조 목록"
          aria-label="구조 목록 열기"
        >
          <PanelLeft size={17} />
        </button>
        <button type="button" className="import-action" onClick={p.onImport}>
          <Code2 size={17} />
          Mermaid 붙여넣기
        </button>
        <span className="toolbar-divider" />
        <button type="button" onClick={p.onAdd}>
          <Plus size={17} />
          노드 추가
        </button>
        <button
          type="button"
          onClick={p.onGroup}
          disabled={!p.selectedCount}
          title="그룹화 / 해제 · ⌘G / Ctrl+G"
        >
          {p.isGroup ? <Ungroup size={17} /> : <Group size={17} />}
          {p.isSubgraph ? "서브그래프 풀기" : p.isGroup ? "그룹 해제" : "그룹화"}
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="선택 작업 메뉴"
          title="선택 작업 · 우클릭"
          onClick={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            p.onActions({ x: bounds.x, y: bounds.bottom + 4 });
          }}
        >
          <MoreHorizontal size={17} />
        </button>
        <button type="button" onClick={p.onLayout}>
          <LayoutGrid size={16} />
          자동 정렬
        </button>
        <span className="toolbar-spacer" />
        <button
          type="button"
          className="icon-button"
          aria-label="되돌리기"
          title="되돌리기 · ⌘Z / Ctrl+Z"
          onClick={p.onUndo}
          disabled={!p.canUndo}
        >
          <Undo2 size={17} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="다시 실행"
          title="다시 실행 · ⌘⇧Z / Ctrl+Shift+Z"
          onClick={p.onRedo}
          disabled={!p.canRedo}
        >
          <Redo2 size={17} />
        </button>
        <span className="toolbar-divider" />
        <button
          type="button"
          className="icon-button"
          aria-label="전체 보기"
          title="전체 보기"
          onClick={p.onFit}
        >
          <Maximize size={17} />
        </button>
        <button
          type="button"
          className="icon-button mobile-inspector"
          aria-label="속성 열기"
          onClick={p.onInspector}
        >
          <SlidersHorizontal size={17} />
        </button>
      </nav>
    </>
  );
}
