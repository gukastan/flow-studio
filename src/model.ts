import { z } from "zod";

export const PALETTE = [
  { name: "시안", value: "#22d3ee" },
  { name: "그린", value: "#34d399" },
  { name: "바이올렛", value: "#a78bfa" },
  { name: "앰버", value: "#fbbf24" },
  { name: "로즈", value: "#fb7185" },
  { name: "오렌지", value: "#fb9238" },
  { name: "슬레이트", value: "#94a3b8" },
] as const;

const point = z.object({ x: z.number().finite(), y: z.number().finite() });
const port = z.object({
  id: z.string().min(1).max(200),
  direction: z.enum(["input", "output"]),
  nodeId: z.string(),
  label: z.string().max(1000),
});
export const nodeSettingsSchema = z.object({
  label: z.string().max(1000),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  shape: z.enum(["process", "decision", "terminal"]),
});
const exposedSetting = z.object({
  id: z.string().min(1).max(200),
  nodeId: z.string(),
  property: nodeSettingsSchema.keyof(),
  label: z.string().max(200),
});
const item = z.object({
  id: z.string().min(1).max(200),
  kind: z.enum(["node", "group"]),
  label: nodeSettingsSchema.shape.label,
  color: nodeSettingsSchema.shape.color,
  position: point,
  parent: z.string().nullable(),
  collapsed: z.boolean(),
  width: z.number().min(100).max(100000),
  height: z.number().min(60).max(100000),
  shape: nodeSettingsSchema.shape.shape,
  subgraph: z.boolean().optional(),
  ports: z.array(port).max(2000).optional(),
  exposedSettings: z.array(exposedSetting).max(3000).optional(),
});
const link = z.object({
  id: z.string().min(1),
  source: z.string(),
  target: z.string(),
  sourceSide: z.enum(["left", "top", "right", "bottom"]).optional(),
  targetSide: z.enum(["left", "top", "right", "bottom"]).optional(),
  label: z.string().max(1000),
  dashed: z.boolean(),
  arrow: z.boolean(),
});
export const documentSchema = z.object({
  format: z.literal("flow-studio"),
  version: z.literal(1),
  title: z.string().min(1).max(200),
  nodes: z.array(item).max(1000),
  edges: z.array(link).max(5000),
});
export type Item = Readonly<z.infer<typeof item>>;
export type Link = Readonly<z.infer<typeof link>>;
export type ConnectionSide = NonNullable<Link["sourceSide"]>;
export type Document = Readonly<z.infer<typeof documentSchema>>;
export type Point = Readonly<z.infer<typeof point>>;
export type Port = Readonly<z.infer<typeof port>>;
export type ExposedSetting = Readonly<z.infer<typeof exposedSetting>>;
export function isSubgraph(node: Item | undefined): boolean {
  return node?.kind === "group" && node.subgraph === true;
}

export class DocumentError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = "DocumentError";
  }
}
export function parseDocument(value: unknown): Document {
  const result = documentSchema.safeParse(value);
  if (!result.success)
    throw new DocumentError("Flow Studio 프로젝트 파일 형식이 올바르지 않습니다.");
  const doc = result.data;
  const nodes = new Map(doc.nodes.map((node) => [node.id, node]));
  if (
    nodes.size !== doc.nodes.length ||
    new Set(doc.edges.map((e) => e.id)).size !== doc.edges.length
  )
    throw new DocumentError("중복된 노드 또는 연결 ID가 있습니다.");
  for (const node of doc.nodes) {
    const visited = new Set([node.id]);
    let parent = node.parent;
    while (parent) {
      const group = nodes.get(parent);
      if (group?.kind !== "group" || visited.has(parent))
        throw new DocumentError("그룹 관계가 올바르지 않거나 순환합니다.");
      visited.add(parent);
      parent = group.parent;
    }
  }
  if (doc.edges.some((e) => !nodes.has(e.source) || !nodes.has(e.target)))
    throw new DocumentError("존재하지 않는 노드를 가리키는 연결이 있습니다.");
  for (const node of doc.nodes) {
    if (node.subgraph && node.kind !== "group")
      throw new DocumentError("서브그래프는 내부 노드를 담는 그룹이어야 합니다.");
    const ports = node.ports ?? [];
    if (ports.length && !isSubgraph(node))
      throw new DocumentError("입력·출력은 서브그래프에만 지정할 수 있습니다.");
    const children = descendants(doc, node.id);
    const settings = node.exposedSettings ?? [];
    if (
      (settings.length && !isSubgraph(node)) ||
      new Set(settings.map((s) => s.id)).size !== settings.length ||
      new Set(settings.map((s) => `${s.nodeId}:${s.property}`)).size !== settings.length ||
      settings.some((s) => !children.has(s.nodeId) || nodes.get(s.nodeId)?.kind !== "node")
    )
      throw new DocumentError("서브그래프에 노출한 설정이 올바르지 않습니다.");
    if (
      new Set(ports.map((p) => p.id)).size !== ports.length ||
      new Set(ports.map((p) => `${p.direction}:${p.nodeId}`)).size !== ports.length ||
      ports.some((p) => !children.has(p.nodeId) || nodes.get(p.nodeId)?.kind !== "node")
    )
      throw new DocumentError("서브그래프의 입력·출력 연결이 올바르지 않습니다.");
  }
  return doc;
}
export function newNode(position: Point): Item {
  return {
    id: `n_${crypto.randomUUID().slice(0, 8)}`,
    kind: "node",
    label: "새 노드",
    color: PALETTE[0].value,
    position,
    parent: null,
    collapsed: false,
    width: 224,
    height: 88,
    shape: "process",
  };
}
export function descendants(doc: Document, id: string): Set<string> {
  const found = new Set<string>();
  const visit = (parent: string) => {
    for (const child of doc.nodes.filter((n) => n.parent === parent)) {
      found.add(child.id);
      visit(child.id);
    }
  };
  visit(id);
  return found;
}
export function ancestors(doc: Document, id: string): string[] {
  const found: string[] = [];
  let node = doc.nodes.find((n) => n.id === id);
  while (node?.parent) {
    found.push(node.parent);
    node = doc.nodes.find((n) => n.id === node?.parent);
  }
  return found;
}
export const emptyDocument: Document = {
  format: "flow-studio",
  version: 1,
  title: "이름 없는 흐름",
  nodes: [],
  edges: [],
};
