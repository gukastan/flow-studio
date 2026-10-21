import { Position } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import type { Point } from "./model";
import type { RouteBox } from "./sameSideRoute";
import { routeBoxesByNode, sameSideRoute } from "./sameSideRoute";

function sample(path: string): Point[] {
  const numbers = (path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
  let start = { x: numbers[0] ?? 0, y: numbers[1] ?? 0 };
  const points: Point[] = [start];
  for (let i = 2; i < numbers.length; i += 6) {
    const [x1, y1, x2, y2, x3, y3] = numbers.slice(i, i + 6);
    if (
      x1 === undefined ||
      y1 === undefined ||
      x2 === undefined ||
      y2 === undefined ||
      x3 === undefined ||
      y3 === undefined
    )
      throw new Error("Incomplete cubic path");
    for (let step = 1; step <= 40; step++) {
      const t = step / 40,
        u = 1 - t;
      points.push({
        x: u ** 3 * start.x + 3 * u ** 2 * t * x1 + 3 * u * t ** 2 * x2 + t ** 3 * x3,
        y: u ** 3 * start.y + 3 * u ** 2 * t * y1 + 3 * u * t ** 2 * y2 + t ** 3 * y3,
      });
    }
    start = { x: x3, y: y3 };
  }
  return points;
}

const row: RouteBox[] = [
  { id: "a", x: 0, y: 0, width: 224, height: 88 },
  { id: "b", x: 320, y: 0, width: 224, height: 140 },
  { id: "c", x: 640, y: 0, width: 224, height: 88 },
  { id: "d", x: 960, y: 0, width: 224, height: 88 },
];
const transforms = [
  { side: Position.Bottom, point: (p: Point) => p, outward: { x: 0, y: 1 } },
  { side: Position.Top, point: (p: Point) => ({ x: p.x, y: -p.y }), outward: { x: 0, y: -1 } },
  { side: Position.Right, point: (p: Point) => ({ x: p.y, y: p.x }), outward: { x: 1, y: 0 } },
  { side: Position.Left, point: (p: Point) => ({ x: -p.y, y: p.x }), outward: { x: -1, y: 0 } },
];

describe("same-side return spline", () => {
  it("keeps an existing return route fixed when an unrelated node is added beneath it", () => {
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "c", target: "d" },
      { source: "d", target: "a" },
    ];
    const options = {
      source: { id: "d", x: 1072, y: 88 },
      target: { id: "a", x: 112, y: 88 },
      side: Position.Bottom,
      lane: 0,
    };
    const original = sameSideRoute({
      ...options,
      boxes: routeBoxesByNode(row, edges).get("d") ?? [],
    });
    const withNewNode = sameSideRoute({
      ...options,
      boxes:
        routeBoxesByNode(
          [...row, { id: "new", x: 400, y: 160, width: 224, height: 88 }],
          edges,
        ).get("d") ?? [],
    });
    expect(withNewNode).toEqual(original);
  });

  it("still clears a connected card in the same flow", () => {
    const boxes = routeBoxesByNode(row, [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "c", target: "d" },
      { source: "d", target: "a" },
    ]).get("d");
    expect(boxes?.map((box) => box.id).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it.each(transforms)(
    "clears intermediate cards and approaches $side handles from outside",
    ({ side, point, outward }) => {
      // Given
      const boxes = row.map((box) => {
        const a = point(box),
          b = point({ x: box.x + box.width, y: box.y + box.height });
        return {
          id: box.id,
          x: Math.min(a.x, b.x),
          y: Math.min(a.y, b.y),
          width: Math.abs(a.x - b.x),
          height: Math.abs(a.y - b.y),
        };
      });
      const source = { ...point({ x: 1072, y: 88 }), id: "d" };
      const target = { ...point({ x: 112, y: 88 }), id: "a" };
      // When
      const route = sameSideRoute({ source, target, boxes, side, lane: 0 });
      const points = sample(route.path);
      // Then
      for (const p of points) {
        for (const box of boxes.filter((box) => ["b", "c"].includes(box.id))) {
          const dx = Math.max(box.x - p.x, p.x - box.x - box.width, 0);
          const dy = Math.max(box.y - p.y, p.y - box.y - box.height, 0);
          expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(48 - 0.001);
        }
      }
      const first = points[1],
        beforeEnd = points.at(-2);
      expect(
        first && (first.x - source.x) * outward.x + (first.y - source.y) * outward.y,
      ).toBeGreaterThan(0);
      expect(
        beforeEnd && (beforeEnd.x - target.x) * outward.x + (beforeEnd.y - target.y) * outward.y,
      ).toBeGreaterThan(0);
      expect(points.at(-1)).toEqual({ x: target.x, y: target.y });
      expect({ x: route.labelX, y: route.labelY }).toEqual(point({ x: 592, y: 188 }));
    },
  );

  it("moves the route and label outward when a middle card becomes taller", () => {
    // Given
    const boxes = row.map((box) => (box.id === "b" ? { ...box, height: 280 } : box));
    // When
    const route = sameSideRoute({
      source: { id: "d", x: 1072, y: 88 },
      target: { id: "a", x: 112, y: 88 },
      side: Position.Bottom,
      boxes,
      lane: 0,
    });
    // Then
    expect(route.labelY).toBeGreaterThanOrEqual(328);
    expect(
      sample(route.path)
        .filter((p) => p.x >= 320 && p.x <= 544)
        .every((p) => p.y >= 328),
    ).toBe(true);
  });

  it("goes around a card that blocks the outward leg of a stacked connection", () => {
    // Given
    const boxes = [
      { id: "a", x: 0, y: 0, width: 224, height: 88 },
      { id: "b", x: 0, y: 300, width: 224, height: 88 },
    ];
    // When
    const route = sameSideRoute({
      source: { id: "a", x: 112, y: 88 },
      target: { id: "b", x: 112, y: 388 },
      side: Position.Bottom,
      boxes,
      lane: 0,
    });
    // Then
    expect(sample(route.path).some((p) => p.x > 0 && p.x < 224 && p.y > 300 && p.y < 388)).toBe(
      false,
    );
  });

  it("separates duplicate return connections into distinct outside lanes", () => {
    // Given
    const options = {
      source: { id: "d", x: 1072, y: 88 },
      target: { id: "a", x: 112, y: 88 },
      side: Position.Bottom,
      boxes: row,
    };
    // When
    const routes = [0, 1].map((lane) => sameSideRoute({ ...options, lane }));
    // Then
    expect(routes[1]?.labelY).toBeGreaterThan(routes[0]?.labelY ?? 0);
    expect(routes[1]?.path).not.toBe(routes[0]?.path);
  });
});
