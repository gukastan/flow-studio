import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useFileDrop } from "./useFileDrop";

const onFile = vi.fn();
function Harness() {
  const { dropping, ...handlers } = useFileDrop(onFile);
  return (
    <main {...handlers} data-active={dropping}>
      <span>Canvas</span>
    </main>
  );
}
afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
  onFile.mockClear();
});
it("accepts a real file drop, prevents browser navigation and clears the overlay", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<Harness />));
  const canvas = container.querySelector("main");
  const file = new File(["png fixture"], "project.flow.png", { type: "image/png" });
  const transfer = { types: ["Files"], files: [file], dropEffect: "none" };
  const over = new Event("dragover", { bubbles: true, cancelable: true });
  Object.defineProperty(over, "dataTransfer", { value: transfer });
  act(() => canvas?.dispatchEvent(over));
  expect(over.defaultPrevented).toBe(true);
  expect(transfer.dropEffect).toBe("copy");
  expect(canvas?.getAttribute("data-active")).toBe("true");
  const drop = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(drop, "dataTransfer", { value: transfer });
  act(() => canvas?.dispatchEvent(drop));
  expect(drop.defaultPrevented).toBe(true);
  expect(onFile).toHaveBeenCalledExactlyOnceWith(file);
  expect(canvas?.getAttribute("data-active")).toBe("false");
  act(() => root.unmount());
});
it("leaves ordinary canvas drags alone", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<Harness />));
  const event = new Event("dragover", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { types: ["text/plain"] } });
  act(() => container.querySelector("main")?.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(false);
  expect(onFile).not.toHaveBeenCalled();
  act(() => root.unmount());
});
