import { z } from "zod";
import { autoLayout } from "./layout";
import type { Document, Item, Link } from "./model";
import { DocumentError, PALETTE, parseDocument } from "./model";

const vertexSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  type: z.string().optional(),
  styles: z.array(z.string()).default([]),
});
const edgeSchema = z.object({
  start: z.string(),
  end: z.string(),
  text: z.string().default(""),
  type: z.string().optional(),
  stroke: z.string().optional(),
});
const groupSchema = z.object({
  id: z.string(),
  title: z.string(),
  nodes: z.array(z.string()),
});
function textOnly(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
function fillColor(styles: readonly string[], fallback: string): string {
  const fill = styles
    .join(";")
    .match(/(?:^|[;,])\s*fill:\s*(#[a-f0-9]{6}|#[a-f0-9]{3})(?=[;,\s]|$)/i)?.[1];
  return fill?.length === 4
    ? `#${[...fill.slice(1)].map((c) => `${c}${c}`).join("")}`
    : (fill ?? fallback);
}
export async function importMermaid(source: string): Promise<Document> {
  const code = source
    .trim()
    .replace(/^```(?:mermaid)?\s*\n/, "")
    .replace(/\n```\s*$/, "");
  if (code.length > 100000) throw new DocumentError("코드는 100,000자 이내로 입력해 주세요.");
  if (!/^(?:%%[^\n]*\n\s*)*(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/.test(code))
    throw new DocumentError("flowchart 또는 graph로 시작하는 Mermaid 흐름도를 입력해 주세요.");
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    maxEdges: 5000,
    flowchart: { htmlLabels: false },
  });
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(code);
  const db: unknown = diagram.db;
  if (
    typeof db !== "object" ||
    db === null ||
    !("getVertices" in db) ||
    typeof db.getVertices !== "function" ||
    !("getEdges" in db) ||
    typeof db.getEdges !== "function" ||
    !("getSubGraphs" in db) ||
    typeof db.getSubGraphs !== "function"
  )
    throw new DocumentError("이 Mermaid 다이어그램은 흐름도로 변환할 수 없습니다.");
  const rawVertices: unknown = db.getVertices();
  const vertices = z.map(z.string(), vertexSchema).parse(rawVertices);
  const edges = z.array(edgeSchema).parse(db.getEdges());
  const groups = z.array(groupSchema).parse(db.getSubGraphs());
  const groupIds = new Set(groups.map((g) => g.id));
  // Mermaid lists each group's direct children; the shortest containing group is
  // selected to also accommodate parser versions that include descendants.
  const parentOf = (id: string) =>
    groups
      .filter((g) => g.id !== id && g.nodes.includes(id))
      .sort((a, b) => a.nodes.length - b.nodes.length)[0]?.id ?? null;
  const nodes: Item[] = [];
  for (const vertex of vertices.values()) {
    if (groupIds.has(vertex.id)) continue;
    const shape =
      vertex.type === "diamond"
        ? "decision"
        : ["stadium", "round", "circle", "doublecircle", "ellipse"].includes(vertex.type ?? "")
          ? "terminal"
          : "process";
    nodes.push({
      id: vertex.id,
      kind: "node",
      label: textOnly(vertex.text ?? vertex.id),
      color: fillColor(vertex.styles, shape === "decision" ? PALETTE[3].value : PALETTE[0].value),
      position: { x: 0, y: 0 },
      parent: parentOf(vertex.id),
      collapsed: false,
      width: 224,
      height: 88,
      shape,
    });
  }
  for (const group of groups)
    nodes.push({
      id: group.id,
      kind: "group",
      label: textOnly(group.title),
      color: PALETTE[2].value,
      position: { x: 0, y: 0 },
      parent: parentOf(group.id),
      collapsed: false,
      width: 288,
      height: 176,
      shape: "process",
    });
  const links: Link[] = edges.map((edge, index) => ({
    id: `edge_${index}`,
    source: edge.start,
    target: edge.end,
    label: textOnly(edge.text),
    dashed: edge.stroke === "dotted",
    arrow: edge.type !== "arrow_open",
  }));
  const doc = parseDocument({
    format: "flow-studio",
    version: 1,
    title: "가져온 흐름도",
    nodes,
    edges: links,
  });
  const direction = code.match(/(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/)?.[1] ?? "LR";
  return autoLayout(doc, direction === "TD" ? "TB" : direction);
}
