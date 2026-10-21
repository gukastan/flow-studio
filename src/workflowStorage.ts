import { z } from "zod";
import type { Document } from "./model";
import { DocumentError, parseDocument } from "./model";
import { loadInitial } from "./storage";

export type Workflow = { readonly id: string; readonly doc: Document };
export type Workflows = {
  readonly activeId: string;
  readonly items: readonly Workflow[];
};
const storageKey = "flow-studio.workflows.v1";
const savedWorkflows = z.object({
  version: z.literal(1),
  activeId: z.string().min(1),
  items: z.array(z.object({ id: z.string().min(1), doc: z.unknown() })).min(1),
});

export function loadWorkflows(): Workflows & { readonly warning: string } {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = savedWorkflows.parse(JSON.parse(saved));
      const items = parsed.items.map((item) => ({ ...item, doc: parseDocument(item.doc) }));
      if (
        new Set(items.map((item) => item.id)).size !== items.length ||
        !items.some((item) => item.id === parsed.activeId)
      )
        throw new DocumentError("워크플로우 탭 정보가 올바르지 않습니다.");
      return { activeId: parsed.activeId, items, warning: "" };
    }
  } catch (error) {
    if (!(error instanceof Error || error instanceof DOMException)) throw error;
    const legacy = loadInitial();
    return {
      activeId: "initial",
      items: [{ id: "initial", doc: legacy.doc }],
      warning: "자동 저장된 탭을 열지 못했습니다. 저장한 프로젝트 파일을 불러와 주세요.",
    };
  }
  const legacy = loadInitial();
  return {
    activeId: "initial",
    items: [{ id: "initial", doc: legacy.doc }],
    warning: legacy.warning,
  };
}

export function persistWorkflows(workflows: Workflows): string {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, ...workflows }));
    return "";
  } catch (error) {
    if (!(error instanceof Error || error instanceof DOMException)) throw error;
    return "브라우저 자동 저장을 사용할 수 없습니다. 각 워크플로우를 파일로 저장해 주세요.";
  }
}
