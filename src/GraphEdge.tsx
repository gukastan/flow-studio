import type { Edge, EdgeProps } from "@xyflow/react";
import { BaseEdge, getBezierPath, Position } from "@xyflow/react";

export function GraphEdge(props: EdgeProps<Edge<{ lane: number }>>) {
  const lane = props.data?.lane ?? 0;
  const vertical =
    props.sourcePosition === Position.Bottom && props.targetPosition === Position.Top;
  const sx = vertical ? props.sourceY : props.sourceX;
  const sy = vertical ? -props.sourceX : props.sourceY;
  const tx = vertical ? props.targetY : props.targetX;
  const ty = vertical ? -props.targetX : props.targetY;
  const [normal, normalX, normalY] = getBezierPath({ ...props, curvature: 0.25 + lane * 0.15 });
  const returning = tx <= sx && ty <= sy + 24;
  const aligned =
    vertical || (props.sourcePosition === Position.Right && props.targetPosition === Position.Left);
  const outside = aligned && (returning || lane > 0);
  const top = Math.min(sy, ty) - 80 - lane * 36;
  const reach = 40 + lane * 20;
  const path = outside
    ? vertical
      ? `M ${-sy} ${sx} C ${-sy} ${sx + reach}, ${-top} ${sx + reach}, ${-top} ${(sx + tx) / 2}
         S ${-ty} ${tx - reach}, ${-ty} ${tx}`
      : `M ${sx} ${sy} C ${sx + reach} ${sy}, ${sx + reach} ${top}, ${(sx + tx) / 2} ${top}
         S ${tx - reach} ${ty}, ${tx} ${ty}`
    : normal;
  return (
    <BaseEdge
      id={props.id}
      path={path}
      {...(props.markerEnd ? { markerEnd: props.markerEnd } : {})}
      {...(props.style ? { style: props.style } : {})}
      label={props.label}
      labelX={outside ? (vertical ? -top : (sx + tx) / 2) : normalX}
      labelY={outside ? (vertical ? (sx + tx) / 2 : top) : normalY}
      labelStyle={{ fill: "var(--text)", fontSize: 12 }}
      labelBgStyle={{ fill: "var(--canvas)", fillOpacity: 0.96 }}
      labelBgPadding={[8, 5]}
      labelBgBorderRadius={4}
      interactionWidth={24}
    />
  );
}
