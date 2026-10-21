import type { Document } from "./model";
import { DocumentError, parseDocument } from "./model";

const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const keyword = "Flow Studio";
const pixelMagic = encoder.encode("FlowPx01");
const pixelHeaderLength = 16;
export const projectByteLimit = 5_000_000;
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crcTable[(crc ^ byte) & 255] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export function isPng(bytes: Uint8Array): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}
function chunks(bytes: Uint8Array) {
  if (!isPng(bytes)) throw new DocumentError("올바른 PNG 이미지가 아닙니다.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const found: { type: string; start: number; end: number; data: Uint8Array }[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const end = offset + length + 12;
    if (end > bytes.length) throw new DocumentError("PNG 파일이 잘렸거나 손상되었습니다.");
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== view.getUint32(end - 4))
      throw new DocumentError("PNG 파일의 데이터가 손상되었습니다.");
    found.push({ type, start: offset, end, data: bytes.subarray(offset + 8, end - 4) });
    offset = end;
    if (type === "IEND") break;
  }
  if (found[0]?.type !== "IHDR" || found.at(-1)?.type !== "IEND" || offset !== bytes.length)
    throw new DocumentError("PNG 파일 구조가 올바르지 않습니다.");
  return found;
}
function isProjectChunk(chunk: { type: string; data: Uint8Array }): boolean {
  return (
    chunk.type === "iTXt" &&
    String.fromCharCode(...chunk.data.subarray(0, keyword.length + 1)) === `${keyword}\0`
  );
}
export function embedProject(png: Uint8Array, doc: Document): Uint8Array<ArrayBuffer> {
  const text = encoder.encode(JSON.stringify(doc));
  if (text.length > projectByteLimit)
    throw new DocumentError("편집 데이터는 5MB까지 저장할 수 있습니다.");
  const payload = encoder.encode(`${keyword}\0\0\0\0\0${decoder.decode(text)}`);
  const chunk = new Uint8Array(payload.length + 12);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, payload.length);
  chunk.set(encoder.encode("iTXt"), 4);
  chunk.set(payload, 8);
  view.setUint32(chunk.length - 4, crc32(chunk.subarray(4, chunk.length - 4)));
  const parts: Uint8Array[] = [signature];
  for (const original of chunks(png)) {
    if (isProjectChunk(original)) continue;
    if (original.type === "IEND") parts.push(chunk);
    parts.push(png.subarray(original.start, original.end));
  }
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
export function extractProject(png: Uint8Array): Document {
  const project = readEmbeddedProject(png);
  if (project) return project;
  throw new DocumentError(
    "편집 데이터가 없는 이미지입니다. Flow Studio에서 저장한 PNG를 선택해 주세요.",
  );
}
export function readEmbeddedProject(png: Uint8Array): Document | null {
  const entries = chunks(png).filter(isProjectChunk);
  if (!entries.length) return null;
  if (entries.length !== 1) throw new DocumentError("PNG에 프로젝트 데이터가 중복되어 있습니다.");
  const data = entries[0]?.data;
  if (!data || data.length > projectByteLimit + 100)
    throw new DocumentError("PNG의 편집 데이터가 너무 큽니다.");
  let offset = keyword.length + 1;
  if (data[offset] !== 0 || data[offset + 1] !== 0)
    throw new DocumentError("지원하지 않는 PNG 편집 데이터 형식입니다.");
  offset += 2;
  for (let field = 0; field < 2; field++) {
    const end = data.indexOf(0, offset);
    if (end < 0) throw new DocumentError("PNG의 편집 데이터가 손상되었습니다.");
    offset = end + 1;
  }
  return parseDocument(JSON.parse(decoder.decode(data.subarray(offset))));
}

function pixelChannel(bitIndex: number): number {
  return Math.floor(bitIndex / 3) * 4 + (bitIndex % 3);
}
function readPixelByte(pixels: Uint8ClampedArray, byteIndex: number): number {
  let value = 0;
  for (let bit = 0; bit < 8; bit++)
    value = (value << 1) | ((pixels[pixelChannel(byteIndex * 8 + bit)] ?? 0) & 1);
  return value;
}
export function writeProjectPixels(pixels: Uint8ClampedArray, doc: Document): void {
  const project = encoder.encode(JSON.stringify(doc));
  if (project.length > projectByteLimit)
    throw new DocumentError("편집 데이터는 5MB까지 저장할 수 있습니다.");
  const bytes = new Uint8Array(pixelHeaderLength + project.length);
  bytes.set(pixelMagic);
  const header = new DataView(bytes.buffer);
  header.setUint32(8, project.length);
  header.setUint32(12, crc32(project));
  bytes.set(project, pixelHeaderLength);
  if ((pixels.length / 4) * 3 < bytes.length * 8)
    throw new DocumentError("이미지 크기에 비해 편집 데이터가 많습니다. JSON으로 저장해 주세요.");
  for (let byteIndex = 0; byteIndex < bytes.length; byteIndex++) {
    const value = bytes[byteIndex] ?? 0;
    for (let bit = 0; bit < 8; bit++) {
      const channel = pixelChannel(byteIndex * 8 + bit);
      pixels[channel] = ((pixels[channel] ?? 0) & 254) | ((value >>> (7 - bit)) & 1);
    }
  }
}
export function readProjectPixels(pixels: Uint8ClampedArray): Document | null {
  if ((pixels.length / 4) * 3 < pixelHeaderLength * 8) return null;
  if (pixelMagic.some((byte, index) => readPixelByte(pixels, index) !== byte)) return null;
  const header = new Uint8Array(pixelHeaderLength);
  for (let index = 8; index < pixelHeaderLength; index++)
    header[index] = readPixelByte(pixels, index);
  const view = new DataView(header.buffer);
  const length = view.getUint32(8);
  if (length > projectByteLimit || (pixels.length / 4) * 3 < (pixelHeaderLength + length) * 8)
    throw new DocumentError("이미지의 편집 데이터가 손상되었습니다.");
  const project = new Uint8Array(length);
  for (let index = 0; index < length; index++)
    project[index] = readPixelByte(pixels, pixelHeaderLength + index);
  if (crc32(project) !== view.getUint32(12))
    throw new DocumentError("이미지의 편집 데이터가 손상되었습니다.");
  return parseDocument(JSON.parse(decoder.decode(project)));
}
