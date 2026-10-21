import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  readonly side: "outline" | "inspector";
  readonly expanded: boolean;
  readonly onClick: () => void;
};

export function PanelToggle({ side, expanded, onClick }: Props) {
  const label = `${side === "outline" ? "구조" : "속성"} ${expanded ? "접기" : "펼치기"}`;
  const pointsLeft = (side === "outline") === expanded;
  return (
    <button
      type="button"
      id={`${expanded ? "collapse" : "restore"}-${side}`}
      className={`icon-button panel-toggle ${expanded ? "" : `panel-restore restore-${side}`}`}
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      aria-controls={`${side}-panel`}
      onClick={onClick}
    >
      {pointsLeft ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  );
}
