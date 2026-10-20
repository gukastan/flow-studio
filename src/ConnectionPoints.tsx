import { Handle, Position } from "@xyflow/react";
import { CONNECTION_SIDES, NODE_HANDLES, portHandle } from "./connectionHandles";
import type { Item, Port } from "./model";

const positions = {
  left: Position.Left,
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
};
const labels = { left: "왼쪽", top: "위쪽", right: "오른쪽", bottom: "아래쪽" };
type Props = {
  readonly item: Item;
  readonly slot?: { readonly port: Port; readonly index: number; readonly count: number };
};

export function ConnectionPoints({ item, slot }: Props) {
  return CONNECTION_SIDES.map((side) => (
    <Handle
      key={side}
      type="source"
      position={positions[side]}
      id={slot ? portHandle(item, slot.port, side) : NODE_HANDLES[side]}
      style={
        slot
          ? side === "left" || side === "right"
            ? { top: 76 + slot.index * 28 }
            : { left: `${((slot.index + 1) / (slot.count + 1)) * 100}%` }
          : undefined
      }
      aria-label={`${item.label}${slot ? ` ${slot.port.label}` : ""} ${labels[side]} 연결점`}
      title={`${slot ? `${slot.port.label} · ` : ""}${labels[side]} 연결점 · 드래그해 연결`}
    />
  ));
}
