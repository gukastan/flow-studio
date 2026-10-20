// @vitest-environment node
import { expect, it } from "vitest";
import { emptyDocument } from "./model";
import { embedProject } from "./pngProject";
import { readProject } from "./storage";

const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);
it("uses the same validated document for JSON and PNG file imports", async () => {
  const doc = { ...emptyDocument, title: "저장 후 복원" };
  expect(await readProject(new File([JSON.stringify(doc)], "project.flow.json"))).toEqual(doc);
  expect(await readProject(new File([embedProject(png, doc)], "project.flow.png"))).toEqual(doc);
});
it("rejects ordinary PNG and invalid JSON files", async () => {
  await expect(readProject(new File([png], "ordinary.png"))).rejects.toThrow("편집 데이터가 없는");
  await expect(readProject(new File(['{"format":"wrong"}'], "bad.json"))).rejects.toThrow("형식");
});
it("applies the input byte limit before allocating the contents", async () => {
  const file = new File([], "huge.png");
  Object.defineProperty(file, "size", { value: 40_000_001 });
  await expect(readProject(file)).rejects.toThrow("40MB");
});
