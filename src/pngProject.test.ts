import { describe, expect, it } from "vitest";
import { convertToSubgraph } from "./graph";
import { emptyDocument, newNode } from "./model";
import { embedProject, extractProject, readProjectPixels, writeProjectPixels } from "./pngProject";

const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);
const doc = convertToSubgraph(
  {
    ...emptyDocument,
    title: "한글 흐름 · PNG 복원",
    nodes: [
      { ...newNode({ x: -100, y: 0 }), id: "a", label: "입력" },
      { ...newNode({ x: 400, y: 200 }), id: "b", color: "#fb7185" },
      { ...newNode({ x: 800, y: 200 }), id: "c" },
    ],
    edges: [
      {
        id: "ab",
        source: "a",
        target: "b",
        sourceSide: "bottom",
        targetSide: "top",
        label: "내부",
        dashed: true,
        arrow: true,
      },
      { id: "ac", source: "a", target: "c", label: "바깥", dashed: false, arrow: true },
    ],
  },
  ["a", "b"],
);

describe("editable PNG", () => {
  it("restores a project from image pixels after PNG metadata is removed", () => {
    const size = Math.ceil(((16 + new TextEncoder().encode(JSON.stringify(doc)).length) * 8) / 3);
    const pixels = new Uint8ClampedArray((size + 1) * 4).fill(100);
    for (let index = 3; index < pixels.length; index += 4) pixels[index] = 255;
    writeProjectPixels(pixels, doc);
    expect(readProjectPixels(pixels)).toEqual(doc);
    expect(
      pixels.every((value, index) =>
        index % 4 === 3 ? value === 255 : Math.abs(value - 100) <= 1,
      ),
    ).toBe(true);
  });
  it("rejects damaged pixel data and images too small to hold the project", () => {
    const pixels = new Uint8ClampedArray(20_000).fill(100);
    writeProjectPixels(pixels, emptyDocument);
    pixels[172] = (pixels[172] ?? 0) ^ 1;
    expect(() => readProjectPixels(pixels)).toThrow("손상");
    expect(() => writeProjectPixels(new Uint8ClampedArray(4), doc)).toThrow("이미지 크기");
    expect(readProjectPixels(new Uint8ClampedArray(4))).toBeNull();
  });
  it("round trips Korean labels, coordinates, colors, subgraphs, ports and connection sides", () => {
    expect(extractProject(embedProject(png, doc))).toEqual(doc);
  });
  it("round trips manually positioned subgraph boundary cards", () => {
    const placed = {
      ...doc,
      nodes: doc.nodes.map((n) =>
        n.subgraph
          ? { ...n, boundaryOffsets: { input: { x: -950, y: 140 }, output: { x: 1600, y: -80 } } }
          : n,
      ),
    };
    expect(extractProject(embedProject(png, placed))).toEqual(placed);
  });
  it("preserves image data and replaces previous metadata instead of appending duplicate projects", () => {
    const first = embedProject(png, doc);
    const second = embedProject(first, { ...doc, title: "새 이름" });
    expect(extractProject(second).title).toBe("새 이름");
    expect([...second.subarray(8, 58)]).toEqual([...png.subarray(8, 58)]);
    expect(second.length).toBeLessThan(first.length + 100);
  });
  it("rejects ordinary images without fabricating a graph", () => {
    expect(() => extractProject(png)).toThrow("편집 데이터가 없는 이미지");
  });
  it("rejects truncated chunks and forged chunk lengths", () => {
    expect(() => extractProject(embedProject(png, doc).slice(0, -5))).toThrow();
    const corrupt = png.slice();
    new DataView(corrupt.buffer).setUint32(8, 0xffffffff);
    expect(() => extractProject(corrupt)).toThrow("잘렸거나 손상");
  });
  it("rejects modified metadata by CRC before parsing it", () => {
    const corrupt = embedProject(png, doc);
    const index = corrupt.length - 20;
    corrupt[index] = (corrupt[index] ?? 0) ^ 1;
    expect(() => extractProject(corrupt)).toThrow("손상");
  });
  it("validates graph references after reading metadata", () => {
    const invalid = {
      ...emptyDocument,
      edges: [{ id: "bad", source: "x", target: "y", label: "", dashed: false, arrow: true }],
    };
    expect(() => extractProject(embedProject(png, invalid))).toThrow("존재하지 않는 노드");
  });
  it("round trips an empty project and enforces the metadata size limit", () => {
    expect(extractProject(embedProject(png, emptyDocument))).toEqual(emptyDocument);
    expect(() => embedProject(png, { ...emptyDocument, title: "x".repeat(5_000_001) })).toThrow(
      "5MB",
    );
  });
});
