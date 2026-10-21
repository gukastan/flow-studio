import { Position } from "@xyflow/react";
import type { Point } from "./model";

export type RouteBox = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};
export type EdgeRoutingData = { readonly lane: number; readonly boxes: readonly RouteBox[] };
export function routeBoxesForEdge(
  boxesById: ReadonlyMap<string, RouteBox>,
  edge: { readonly source: string; readonly target: string },
): readonly RouteBox[] {
  const source = boxesById.get(edge.source);
  const target = boxesById.get(edge.target);
  return [source, target].filter((box): box is RouteBox => box !== undefined);
}
type Endpoint = Point & { readonly id: string };
type Options = {
  readonly source: Endpoint;
  readonly target: Endpoint;
  readonly side: Position;
  readonly boxes: readonly RouteBox[];
  readonly lane: number;
};
const clearance = 48;

function frame(side: Position) {
  const transforms = {
    [Position.Bottom]: { local: (p: Point) => p, world: (p: Point) => p },
    [Position.Top]: {
      local: (p: Point) => ({ x: p.x, y: -p.y }),
      world: (p: Point) => ({ x: p.x, y: -p.y }),
    },
    [Position.Right]: {
      local: (p: Point) => ({ x: p.y, y: p.x }),
      world: (p: Point) => ({ x: p.y, y: p.x }),
    },
    [Position.Left]: {
      local: (p: Point) => ({ x: p.y, y: -p.x }),
      world: (p: Point) => ({ x: -p.y, y: p.x }),
    },
  };
  return transforms[side];
}

function roundedSpline(points: readonly Point[]): string {
  const start = points[0];
  if (!start) return "";
  let path = `M ${start.x} ${start.y}`;
  let current = start;
  const line = (end: Point) => {
    path += ` C ${current.x} ${current.y}, ${end.x} ${end.y}, ${end.x} ${end.y}`;
    current = end;
  };
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1],
      corner = points[i],
      next = points[i + 1];
    if (!previous || !corner || !next) continue;
    const incoming = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outgoing = Math.hypot(next.x - corner.x, next.y - corner.y);
    if (!incoming || !outgoing) continue;
    const radius = Math.min(24, incoming / 2, outgoing / 2);
    const before = {
      x: corner.x + ((previous.x - corner.x) * radius) / incoming,
      y: corner.y + ((previous.y - corner.y) * radius) / incoming,
    };
    const after = {
      x: corner.x + ((next.x - corner.x) * radius) / outgoing,
      y: corner.y + ((next.y - corner.y) * radius) / outgoing,
    };
    line(before);
    const k = 0.55228475;
    path += ` C ${before.x + (corner.x - before.x) * k} ${before.y + (corner.y - before.y) * k}, ${after.x + (corner.x - after.x) * k} ${after.y + (corner.y - after.y) * k}, ${after.x} ${after.y}`;
    current = after;
  }
  const end = points.at(-1);
  if (end) line(end);
  return path;
}

export function sameSideRoute(options: Options) {
  const { local, world } = frame(options.side);
  const source = local(options.source),
    target = local(options.target);
  const boxes = options.boxes.map((box) => {
    const a = local({ x: box.x, y: box.y });
    const b = local({ x: box.x + box.width, y: box.y + box.height });
    return {
      id: box.id,
      left: Math.min(a.x, b.x),
      right: Math.max(a.x, b.x),
      top: Math.min(a.y, b.y),
      bottom: Math.max(a.y, b.y),
    };
  });
  const span = boxes.filter(
    (box) => box.right >= Math.min(source.x, target.x) && box.left <= Math.max(source.x, target.x),
  );
  const depth =
    Math.max(source.y, target.y, ...span.map((box) => box.bottom)) + clearance + options.lane * 36;
  const leg = (point: Point, id: string) => {
    const blocked = boxes.filter(
      (box) =>
        box.id !== id &&
        box.left < point.x &&
        box.right > point.x &&
        box.bottom > point.y &&
        box.top < depth,
    );
    if (!blocked.length) return [point, { x: point.x, y: depth }];
    const left = Math.min(point.x, ...boxes.map((box) => box.left)) - clearance;
    const right = Math.max(point.x, ...boxes.map((box) => box.right)) + clearance;
    const x = point.x - left < right - point.x ? left : right;
    const exit =
      point.y +
      Math.max(0, Math.min(24, (Math.min(...blocked.map((box) => box.top)) - point.y) / 2));
    return [point, { x: point.x, y: exit }, { x, y: exit }, { x, y: depth }];
  };
  const from = leg(source, options.source.id),
    to = leg(target, options.target.id);
  const fromLane = from.at(-1) ?? source,
    toLane = to.at(-1) ?? target;
  const label = world({ x: (fromLane.x + toLane.x) / 2, y: depth });
  return {
    path: roundedSpline([...from, ...[...to].reverse()].map(world)),
    labelX: label.x,
    labelY: label.y,
  };
}
