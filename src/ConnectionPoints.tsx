import { Handle, Position } from "@xyflow/react";
import { CONNECTION_SIDES, NODE_HANDLES } from "./connectionHandles";
import type { Item } from "./model";

const positions = {
  left: Position.Left,
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
};
const labels = { left: "왼쪽", top: "위쪽", right: "오른쪽", bottom: "아래쪽" };
type Props = {
  readonly item: Item;
};

export function ConnectionPoints({ item }: Props) {
  return CONNECTION_SIDES.map((side) => (
    <Handle
      key={side}
      type="source"
      position={positions[side]}
      id={NODE_HANDLES[side]}
      aria-label={`${item.label} ${labels[side]} 연결점`}
      title={`${labels[side]} 연결점 · 드래그해 연결`}
    />
  ));
}
