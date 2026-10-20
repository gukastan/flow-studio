import { toBlob } from "html-to-image";
import type { Document } from "./model";
import { DocumentError } from "./model";
import { embedProject } from "./pngProject";

export async function exportImage(doc: Document): Promise<Blob> {
  const viewport = document.querySelector<HTMLElement>(".canvas-region .react-flow__viewport");
  if (!viewport) throw new DocumentError("캔버스를 준비한 뒤 다시 저장해 주세요.");
  const elements = [
    ...viewport.querySelectorAll(
      ".react-flow__node, .react-flow__edge-path, .react-flow__edge-textwrapper",
    ),
  ];
  if (!elements.length) throw new DocumentError("이미지로 저장할 노드가 없습니다.");
  const origin = viewport.getBoundingClientRect();
  const zoom = new DOMMatrix(getComputedStyle(viewport).transform).a;
  const bounds = elements.map((element) => element.getBoundingClientRect());
  const left = (Math.min(...bounds.map((r) => r.left)) - origin.left) / zoom;
  const top = (Math.min(...bounds.map((r) => r.top)) - origin.top) / zoom;
  const width = (Math.max(...bounds.map((r) => r.right)) - origin.left) / zoom - left + 128;
  const height = (Math.max(...bounds.map((r) => r.bottom)) - origin.top) / zoom - top + 128;
  const scale = Math.min(2, 8192 / width, 8192 / height, Math.sqrt(16_000_000 / (width * height)));
  const image = await toBlob(viewport, {
    backgroundColor: getComputedStyle(viewport).getPropertyValue("--canvas").trim(),
    width: Math.ceil(width * scale),
    height: Math.ceil(height * scale),
    pixelRatio: 1,
    skipFonts: true,
    style: {
      transform: `translate(${(64 - left) * scale}px, ${(64 - top) * scale}px) scale(${scale})`,
      transformOrigin: "0 0",
    },
    filter: (element) => !element.classList?.contains("react-flow__nodesselection"),
  });
  if (!image) throw new DocumentError("이미지를 만들지 못했습니다. 다시 시도해 주세요.");
  return new Blob([embedProject(new Uint8Array(await image.arrayBuffer()), doc)], {
    type: "image/png",
  });
}
