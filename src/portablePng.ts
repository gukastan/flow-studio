import type { Document } from "./model";
import { DocumentError } from "./model";
import {
  embedProject,
  readEmbeddedProject,
  readProjectPixels,
  writeProjectPixels,
} from "./pngProject";

async function openPixels(png: Uint8Array): Promise<{
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
  readonly image: ImageData;
}> {
  const bitmap = await createImageBitmap(new Blob([Uint8Array.from(png)], { type: "image/png" }));
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new DocumentError("이미지 편집 데이터를 읽을 수 없습니다.");
    context.drawImage(bitmap, 0, 0);
    return { canvas, context, image: context.getImageData(0, 0, canvas.width, canvas.height) };
  } finally {
    bitmap.close();
  }
}

export async function embedPortableProject(
  png: Uint8Array,
  doc: Document,
): Promise<Uint8Array<ArrayBuffer>> {
  const { canvas, context, image } = await openPixels(png);
  writeProjectPixels(image.data, doc);
  context.putImageData(image, 0, 0);
  const encoded = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new DocumentError("이미지를 만들지 못했습니다. 다시 시도해 주세요."));
    }, "image/png");
  });
  return embedProject(new Uint8Array(await encoded.arrayBuffer()), doc);
}

export async function extractPortableProject(png: Uint8Array): Promise<Document> {
  const embedded = readEmbeddedProject(png);
  if (embedded) return embedded;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const pixels = view.getUint32(16) * view.getUint32(20);
  if (pixels > 16_000_000)
    throw new DocumentError("메타데이터가 없는 PNG는 1,600만 픽셀 이하만 복원할 수 있습니다.");
  if (pixels * 3 < 16 * 8)
    throw new DocumentError(
      "편집 데이터가 없는 이미지입니다. Flow Studio에서 저장한 PNG를 선택해 주세요.",
    );
  const { image } = await openPixels(png);
  const project = readProjectPixels(image.data);
  if (project) return project;
  throw new DocumentError(
    "편집 데이터가 없는 이미지입니다. Flow Studio에서 저장한 PNG를 선택해 주세요.",
  );
}
