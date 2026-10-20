import type { Document } from "./model";
import { DocumentError, parseDocument } from "./model";
import { starter } from "./sample";

const STORAGE_KEY = "flow-studio.document.v1";
export function loadInitial(): { doc: Document; warning: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return { doc: saved ? parseDocument(JSON.parse(saved)) : starter, warning: "" };
  } catch (error) {
    if (error instanceof Error)
      return {
        doc: starter,
        warning: "자동 저장본을 열지 못했습니다. 저장한 프로젝트 파일을 불러와 주세요.",
      };
    throw error;
  }
}
export function persist(doc: Document): string {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    return "";
  } catch (error) {
    if (error instanceof Error)
      return "브라우저 자동 저장을 사용할 수 없습니다. 파일로 저장해 주세요.";
    throw error;
  }
}
export function download(doc: Document) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${doc.title.replace(/[<>:"/\\|?*]/g, "_")}.flow.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readProject(file: File): Promise<Document> {
  if (file.size > 5_000_000) throw new DocumentError("5MB 이하의 프로젝트 파일을 선택해 주세요.");
  return parseDocument(JSON.parse(await file.text()));
}
