import { Plus, Workflow, X } from "lucide-react";
import { useLayoutEffect, useRef } from "react";

export type WorkflowTabsProps = {
  readonly workflows: readonly { readonly id: string; readonly title: string }[];
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
  readonly onAdd: () => void;
  readonly onClose: (id: string) => boolean;
};

export function WorkflowTabs({ workflows, activeId, onSelect, onAdd, onClose }: WorkflowTabsProps) {
  const list = useRef<HTMLDivElement>(null);
  const focusSelected = useRef(false);
  useLayoutEffect(() => {
    if (workflows.length === 0) return;
    function revealSelected() {
      const selected = document.getElementById(`workflow-tab-${activeId}`);
      if (!selected || !list.current) return;
      if (focusSelected.current) {
        selected.focus({ preventScroll: true });
        focusSelected.current = false;
      }
      const viewport = list.current.getBoundingClientRect();
      const tab = (selected.parentElement ?? selected).getBoundingClientRect();
      if (tab.left < viewport.left) list.current.scrollLeft += tab.left - viewport.left;
      else if (tab.right > viewport.right) list.current.scrollLeft += tab.right - viewport.right;
    }
    revealSelected();
    window.addEventListener("resize", revealSelected);
    return () => window.removeEventListener("resize", revealSelected);
  }, [activeId, workflows.length]);
  function close(id: string) {
    if (onClose(id)) focusSelected.current = true;
  }
  return (
    <div className="workflow-tabs">
      <div className="workflow-tab-list" role="tablist" aria-label="워크플로우" ref={list}>
        {workflows.map((workflow, index) => (
          <div
            className="workflow-tab-item"
            role="presentation"
            data-active={workflow.id === activeId}
            key={workflow.id}
          >
            <button
              type="button"
              role="tab"
              className="workflow-tab"
              id={`workflow-tab-${workflow.id}`}
              aria-selected={workflow.id === activeId}
              aria-controls={workflow.id === activeId ? "canvas" : undefined}
              tabIndex={workflow.id === activeId ? 0 : -1}
              title={workflow.title}
              onClick={() => onSelect(workflow.id)}
              onKeyDown={(event) => {
                if (event.key === "Delete") {
                  event.preventDefault();
                  close(workflow.id);
                  return;
                }
                const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
                if (!keys.includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? workflows.length - 1
                      : (index + (event.key === "ArrowRight" ? 1 : -1) + workflows.length) %
                        workflows.length;
                const target = workflows[next];
                if (target && target.id !== activeId) {
                  focusSelected.current = true;
                  onSelect(target.id);
                }
              }}
            >
              <Workflow size={16} aria-hidden="true" />
              <span>{workflow.title}</span>
            </button>
            <button
              type="button"
              className="icon-button workflow-close"
              aria-label={`${workflow.title} 탭 닫기`}
              title="탭 닫기"
              tabIndex={workflow.id === activeId ? 0 : -1}
              onClick={() => close(workflow.id)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="icon-button workflow-add"
        aria-label="워크플로우 추가"
        title="새 워크플로우 추가"
        onClick={() => {
          focusSelected.current = true;
          onAdd();
        }}
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
