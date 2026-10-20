import type { Document, ExposedSetting, Item } from "./model";
import { DocumentError, descendants, isSubgraph, nodeSettingsSchema } from "./model";

export const SETTING_LABELS = { label: "이름", color: "색상", shape: "노드 유형" } as const;
export type SettingChange = { readonly id: string; readonly value: string };
export type SettingValue = {
  readonly setting: ExposedSetting;
  readonly value: string;
};

export function resolveSettings(doc: Document, group: Item): SettingValue[] {
  return (group.exposedSettings ?? []).flatMap((setting) => {
    const node = doc.nodes.find((n) => n.id === setting.nodeId);
    return node ? [{ setting, value: node[setting.property] }] : [];
  });
}

export function exposeSetting(
  doc: Document,
  groupId: string,
  target: { readonly nodeId: string; readonly property: ExposedSetting["property"] },
): Document {
  const group = doc.nodes.find((n) => n.id === groupId);
  const node = doc.nodes.find((n) => n.id === target.nodeId);
  if (!group || !isSubgraph(group) || node?.kind !== "node") return doc;
  if (!descendants(doc, groupId).has(node.id)) return doc;
  if (group.exposedSettings?.some((s) => s.nodeId === node.id && s.property === target.property))
    return doc;
  const setting: ExposedSetting = {
    ...target,
    id: `s_${crypto.randomUUID()}`,
    label: `${node.label} · ${SETTING_LABELS[target.property]}`.slice(0, 200),
  };
  return {
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.id === groupId ? { ...n, exposedSettings: [...(n.exposedSettings ?? []), setting] } : n,
    ),
  };
}

export function updateSettingValue(
  doc: Document,
  groupId: string,
  change: SettingChange,
): Document {
  const setting = doc.nodes
    .find((n) => n.id === groupId)
    ?.exposedSettings?.find((s) => s.id === change.id);
  if (!setting) return doc;
  const node = doc.nodes.find((n) => n.id === setting.nodeId);
  if (!node) return doc;
  const result = nodeSettingsSchema.safeParse({ ...node, [setting.property]: change.value });
  if (!result.success) throw new DocumentError("노드 설정 값이 올바르지 않습니다.");
  return {
    ...doc,
    nodes: doc.nodes.map((n) => (n.id === node.id ? { ...n, ...result.data } : n)),
  };
}
