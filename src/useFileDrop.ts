import type { DragEvent } from "react";
import { useState } from "react";

export function useFileDrop(onFile: (file: File) => void) {
  const [dropping, setDropping] = useState(false);
  return {
    dropping,
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setDropping(true);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !event.currentTarget.contains(event.relatedTarget)
      )
        setDropping(false);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      setDropping(false);
      const file = event.dataTransfer.files[0];
      if (file) onFile(file);
    },
  };
}
