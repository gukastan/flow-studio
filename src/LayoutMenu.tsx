import { ChevronDown, LayoutGrid } from "lucide-react";
import { useCallback, useState } from "react";
import type { Alignment } from "./alignment";
import { ContextMenu } from "./ContextMenu";
import type { Point } from "./model";

type Props = {
  readonly canAlign: boolean;
  readonly onAlign: (direction: Alignment) => void;
  readonly onLayout: (direction: "LR" | "TB") => void;
};
export function LayoutMenu({ canAlign, onAlign, onLayout }: Props) {
  const [point, setPoint] = useState<Point | null>(null);
  const close = useCallback(() => setPoint(null), []);
  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={!!point}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setPoint(point ? null : { x: bounds.x, y: bounds.bottom + 4 });
        }}
      >
        <LayoutGrid size={16} />
        정렬
        <ChevronDown size={14} />
      </button>
      {point && (
        <ContextMenu
          point={point}
          title="노드 정렬"
          onClose={close}
          entries={[
            {
              label: "선택 노드 가로 정렬",
              disabled: !canAlign,
              action: () => onAlign("horizontal"),
            },
            {
              label: "선택 노드 세로 정렬",
              disabled: !canAlign,
              action: () => onAlign("vertical"),
            },
            { label: "전체 가로 자동 정렬", separator: true, action: () => onLayout("LR") },
            { label: "전체 세로 자동 정렬", action: () => onLayout("TB") },
          ]}
        />
      )}
    </>
  );
}
