import { act } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentError } from "./model";
import { useWorkspace } from "./useWorkspace";

function Harness() {
  const workspace = useWorkspace();
  return (
    <>
      <input id="selection" type="checkbox" onChange={() => workspace.select(["a", "d"])} />
      <input id="name" type="text" defaultValue="Example" />
      <output id="groups">{workspace.doc.nodes.filter((n) => n.kind === "group").length}</output>
      <output id="subgraphs">{workspace.doc.nodes.filter((n) => n.subgraph).length}</output>
      <output id="selected">{workspace.selected.join(",")}</output>
      <output id="scope">{workspace.navigation.scope?.id}</output>
      <output id="edges">{workspace.doc.edges.length}</output>
      <output id="nodes">{workspace.doc.nodes.length}</output>
      <button
        type="button"
        id="choose-wires"
        onClick={() => {
          workspace.select([]);
          workspace.setEdgeIds(workspace.doc.edges.slice(0, 2).map((e) => e.id));
        }}
      >
        Select wires
      </button>
      <output id="new-positions">
        {JSON.stringify(
          workspace.doc.nodes.filter((n) => n.id.startsWith("n_")).map((n) => n.position),
        )}
      </output>
      <button type="button" id="add-node" onClick={() => workspace.addNode({ x: 200, y: 200 })}>
        Add node
      </button>
      <button type="button" id="choose-group" onClick={() => workspace.select(["g"])}>
        Select group
      </button>
      <button type="button" id="convert-group" onClick={workspace.subgraph}>
        Convert group
      </button>
      <button
        type="button"
        id="enter-group"
        onClick={() => {
          workspace.navigation.navigate("g");
          workspace.select(["g"]);
        }}
      >
        Enter group with a bubbled selection
      </button>
    </>
  );
}

function input(id: string): HTMLInputElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) throw new DocumentError("Missing fixture input");
  return element;
}

describe("grouping keyboard shortcuts", () => {
  let root: Root | undefined;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    localStorage.clear();
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(<Harness />));
    act(() => input("selection").click());
  });
  afterEach(() => {
    act(() => root?.unmount());
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it("groups selected nodes while a selection checkbox has keyboard focus", () => {
    // Given
    const target = input("selection");
    target.focus();
    // When
    act(() =>
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "g", metaKey: true, bubbles: true }),
      ),
    );
    // Then
    expect(document.getElementById("groups")?.textContent).toBe("2");
    expect(document.getElementById("subgraphs")?.textContent).toBe("0");
  });
  it("uses Control+G to convert a selection and then unpack its selected subgraph", () => {
    const target = input("selection");
    const shortcut = () =>
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "g", ctrlKey: true, bubbles: true }),
      );
    act(shortcut);
    expect(document.getElementById("subgraphs")?.textContent).toBe("1");
    expect(document.getElementById("groups")?.textContent).toBe("2");
    act(shortcut);
    expect(document.getElementById("subgraphs")?.textContent).toBe("0");
    expect(document.getElementById("groups")?.textContent).toBe("1");
    expect(document.getElementById("selected")?.textContent).toBe("a,d");
  });
  it("does not unpack a selected subgraph with Command+G", () => {
    const target = input("selection");
    act(() =>
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "g", ctrlKey: true, bubbles: true }),
      ),
    );
    act(() =>
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "g", metaKey: true, bubbles: true }),
      ),
    );
    expect(document.getElementById("subgraphs")?.textContent).toBe("1");
  });
  it("ignores held-key repeat instead of repeatedly toggling groups", () => {
    // Given
    const target = input("selection");
    // When
    act(() =>
      target.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "g",
          ctrlKey: true,
          repeat: true,
          bubbles: true,
        }),
      ),
    );
    // Then
    expect(document.getElementById("groups")?.textContent).toBe("1");
  });
  it("does not group nodes while editing a text input", () => {
    // Given
    const target = input("name");
    target.focus();
    // When
    act(() =>
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "g", metaKey: true, bubbles: true }),
      ),
    );
    // Then
    expect(document.getElementById("groups")?.textContent).toBe("1");
  });
  it("converts selected nodes with Control+G while the name input has focus", () => {
    const target = input("name");
    target.focus();
    act(() =>
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key: "g", ctrlKey: true, bubbles: true }),
      ),
    );
    expect(document.getElementById("subgraphs")?.textContent).toBe("1");
  });
  it("does not carry the parent card selection into its inner editor", () => {
    // Given
    act(() => document.getElementById("choose-group")?.click());
    act(() => document.getElementById("convert-group")?.click());
    expect(document.getElementById("selected")?.textContent).toBe("g");
    // When
    act(() => document.getElementById("enter-group")?.click());
    // Then
    expect(document.getElementById("scope")?.textContent).toBe("g");
    expect(document.getElementById("selected")?.textContent).toBe("");
  });
  it("places repeated additions far enough apart to keep both cards visible", () => {
    // Given
    act(() => document.getElementById("add-node")?.click());
    // When
    act(() => document.getElementById("add-node")?.click());
    // Then
    const positions = document.getElementById("new-positions")?.textContent ?? "";
    expect(positions).not.toBe('[{"x":200,"y":200},{"x":200,"y":200}]');
    expect(
      new Set(JSON.parse(positions).map((p: { x: number; y: number }) => `${p.x},${p.y}`)).size,
    ).toBe(2);
  });
  it("deletes selected wires with Backspace and keeps nodes intact", () => {
    // Given
    act(() => document.getElementById("choose-wires")?.click());
    // When
    act(() =>
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }),
      ),
    );
    // Then
    expect(document.getElementById("edges")?.textContent).toBe("2");
    expect(document.getElementById("nodes")?.textContent).toBe("5");
  });
});
