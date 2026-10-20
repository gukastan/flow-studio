import { useEffect } from "react";
import { hasOpenOverlay, isTextEditing } from "./keyboard";

type Actions = {
  readonly undo: () => void;
  readonly redo: () => void;
  readonly save: () => void;
  readonly group: () => void;
  readonly selectAll: () => void;
  readonly remove: () => void;
  readonly escape: () => void;
};
export function useShortcuts(actions: Actions) {
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.defaultPrevented || hasOpenOverlay() || isTextEditing(event.target)) return;
      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) actions.redo();
        else actions.undo();
      } else if (modifier && key === "s") {
        event.preventDefault();
        actions.save();
      } else if (modifier && key === "g") {
        event.preventDefault();
        if (!event.repeat) actions.group();
      } else if (modifier && key === "a") {
        event.preventDefault();
        actions.selectAll();
      } else if (key === "delete" || key === "backspace") {
        event.preventDefault();
        actions.remove();
      } else if (key === "escape") actions.escape();
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [actions]);
}
