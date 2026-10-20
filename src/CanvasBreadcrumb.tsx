import { ArrowLeft, ChevronRight, Home, SlidersHorizontal } from "lucide-react";
import type { Item } from "./model";

type Props = {
  readonly path: readonly Item[];
  readonly onNavigate: (id: string | null) => void;
  readonly onLeave: () => void;
  readonly onPorts: () => void;
};
export function CanvasBreadcrumb({ path, onNavigate, onLeave, onPorts }: Props) {
  if (!path.length) return null;
  return (
    <div className="canvas-navigation">
      <button
        type="button"
        className="icon-button"
        aria-label="상위 흐름으로 돌아가기"
        title="상위 흐름 · Esc"
        onClick={onLeave}
      >
        <ArrowLeft size={16} />
      </button>
      <nav aria-label="서브그래프 위치" className="canvas-breadcrumb">
        <button type="button" onClick={() => onNavigate(null)}>
          <Home size={14} /> 전체 흐름
        </button>
        {path.map((node, index) => (
          <span className="breadcrumb-step" key={node.id}>
            <ChevronRight size={12} />
            <button
              type="button"
              aria-current={index === path.length - 1 ? "page" : undefined}
              onClick={() => onNavigate(node.id)}
              title={node.label}
            >
              {node.label}
            </button>
          </span>
        ))}
      </nav>
      <button
        type="button"
        className="icon-button"
        aria-label="입력·출력 편집"
        title="입력·출력 편집"
        onClick={onPorts}
      >
        <SlidersHorizontal size={16} />
      </button>
    </div>
  );
}
