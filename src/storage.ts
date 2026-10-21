import type { Document } from "./model";
import { DocumentError, parseDocument } from "./model";
import { isPng, projectByteLimit } from "./pngProject";
import { extractPortableProject } from "./portablePng";
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
  downloadBlob(
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    `${doc.title}.flow.json`,
  );
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name.replace(/[<>:"/\\|?*]/g, "_");
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function readProject(file: File): Promise<Document> {
  if (file.size > 40_000_000)
    throw new DocumentError("40MB 이하의 PNG 또는 JSON 파일을 선택해 주세요.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (isPng(bytes)) return extractPortableProject(bytes);
  if (file.size > projectByteLimit)
    throw new DocumentError("JSON 파일은 5MB 이하로 선택해 주세요.");
  if (!/\.json$/i.test(file.name))
    throw new DocumentError("JSON 또는 Flow Studio에서 저장한 PNG 파일을 선택해 주세요.");
  return parseDocument(JSON.parse(new TextDecoder().decode(bytes)));
}
