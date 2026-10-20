import type { Edge, EdgeProps } from "@xyflow/react";
import { BaseEdge, getBezierPath } from "@xyflow/react";

export function GraphEdge(props: EdgeProps<Edge<{ lane: number }>>) {
  const { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty } = props;
  const [normal, normalX, normalY] = getBezierPath(props);
  const lane = props.data?.lane ?? 0;
  const returning = tx <= sx && ty <= sy + 24;
  const outside = returning || lane > 0;
  const top = Math.min(sy, ty) - 80 - lane * 36;
  const reach = 40 + lane * 20;
  const path = outside
    ? `M ${sx} ${sy} C ${sx + reach} ${sy}, ${sx + reach} ${top}, ${(sx + tx) / 2} ${top}
       S ${tx - reach} ${ty}, ${tx} ${ty}`
    : normal;
  return (
    <BaseEdge
      id={props.id}
      path={path}
      {...(props.markerEnd ? { markerEnd: props.markerEnd } : {})}
      {...(props.style ? { style: props.style } : {})}
      label={props.label}
      labelX={outside ? (sx + tx) / 2 : normalX}
      labelY={outside ? top : normalY}
      labelStyle={{ fill: "var(--text)", fontSize: 12 }}
      labelBgStyle={{ fill: "var(--canvas)", fillOpacity: 0.96 }}
      labelBgPadding={[8, 5]}
      labelBgBorderRadius={4}
      interactionWidth={24}
    />
  );
}
