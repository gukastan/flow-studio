import { ChevronLeft, ChevronRight } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Point } from "./model";

export type MenuEntry = {
  readonly label: string;
  readonly action?: () => void;
  readonly children?: readonly MenuEntry[];
  readonly disabled?: boolean;
  readonly shortcut?: string;
  readonly color?: string;
  readonly danger?: boolean;
  readonly separator?: boolean;
};
export type MenuTarget =
  | { readonly kind: "nodes"; readonly ids: readonly string[] }
  | { readonly kind: "edge"; readonly id: string }
  | { readonly kind: "pane" };
export type MenuRequest = {
  readonly point: Point;
  readonly target: MenuTarget;
};
type Props = {
  readonly point: Point;
  readonly title: string;
  readonly entries: readonly MenuEntry[];
  readonly onClose: () => void;
};

export function ContextMenu({ point, title, entries, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const origin = useRef(document.activeElement);
  const [category, setCategory] = useState<MenuEntry | null>(null);
  const [position, setPosition] = useState(point);
  const shown = category?.children ?? entries;
  // biome-ignore lint/correctness/useExhaustiveDependencies: Category changes replace the measured panel contents and focus target.
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const bounds = menu.getBoundingClientRect();
    setPosition({
      x: Math.max(8, Math.min(point.x, window.innerWidth - bounds.width - 8)),
      y: Math.max(8, Math.min(point.y, window.innerHeight - bounds.height - 8)),
    });
    menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [point, category]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) onClose();
    }
    function scroll(event: Event) {
      if (event.target instanceof Node && ref.current?.contains(event.target)) return;
      onClose();
    }
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", scroll, true);
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [onClose]);
  function close() {
    onClose();
    if (origin.current instanceof HTMLElement && origin.current.isConnected) {
      origin.current.focus({ preventScroll: true });
    }
  }
  function activate(entry: MenuEntry) {
    if (entry.children) setCategory(entry);
    else {
      close();
      entry.action?.();
    }
  }
  function keydown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();
    const buttons = [
      ...(ref.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []),
    ];
    const index =
      document.activeElement instanceof HTMLButtonElement
        ? buttons.indexOf(document.activeElement)
        : -1;
    switch (event.key) {
      case "Escape":
      case "Tab":
        event.preventDefault();
        close();
        break;
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        buttons[(index + step + buttons.length) % buttons.length]?.focus();
        break;
      }
      case "Home":
      case "End":
        event.preventDefault();
        buttons[event.key === "Home" ? 0 : buttons.length - 1]?.focus();
        break;
      case "ArrowLeft":
        event.preventDefault();
        setCategory(null);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (document.activeElement?.getAttribute("aria-haspopup") === "menu")
          buttons[index]?.click();
        break;
    }
  }
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={category?.label ?? title}
      className="context-menu"
      style={{ left: position.x, top: position.y }}
      onKeyDown={keydown}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="context-heading" title={title}>
        {category?.label ?? title}
      </div>
      {category && (
        <button type="button" role="menuitem" onClick={() => setCategory(null)}>
          <ChevronLeft size={14} /> 뒤로
        </button>
      )}
      {shown.map((entry) => (
        <div key={entry.label}>
          {entry.separator && <hr className="context-divider" />}
          <button
            type="button"
            role="menuitem"
            disabled={entry.disabled}
            aria-haspopup={entry.children ? "menu" : undefined}
            className={entry.danger ? "context-danger" : undefined}
            onClick={() => activate(entry)}
          >
            {entry.color && <span className="context-swatch" style={{ background: entry.color }} />}
            <span className="context-label">{entry.label}</span>
            {entry.shortcut && <span className="context-shortcut">{entry.shortcut}</span>}
            {entry.children && <ChevronRight size={14} />}
          </button>
        </div>
      ))}
    </div>
  );
}
