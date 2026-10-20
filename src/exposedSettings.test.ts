import { describe, expect, it } from "vitest";
import { copySelection, pasteSelection } from "./clipboard";
import { exposeSetting, resolveSettings, updateSettingValue } from "./exposedSettings";
import { convertToSubgraph, removeItems } from "./graph";
import { DocumentError, parseDocument } from "./model";
import { starter } from "./sample";
import { reconcileSubgraphs } from "./subgraphPorts";

function fixture() {
  const doc = reconcileSubgraphs(
    exposeSetting(convertToSubgraph(starter, ["g"]), "g", { nodeId: "b", property: "label" }),
  );
  const group = doc.nodes.find((n) => n.id === "g");
  const setting = group?.exposedSettings?.[0];
  if (!group || !setting) throw new DocumentError("Missing exposed setting fixture");
  return { doc, group, setting };
}
describe("exposed node settings", () => {
  it("edits the original node from the outer card without changing any connections", () => {
    const { doc, setting } = fixture();
    const changed = updateSettingValue(doc, "g", { id: setting.id, value: "바깥에서 편집" });
    expect(changed.nodes.find((n) => n.id === "b")?.label).toBe("바깥에서 편집");
    expect(changed.edges).toBe(doc.edges);
    expect(changed.nodes.find((n) => n.id === "c")).toEqual(doc.nodes.find((n) => n.id === "c"));
  });
  it("reflects a setting changed on the inner node in the outer control", () => {
    const { doc, group, setting } = fixture();
    const changed = {
      ...doc,
      nodes: doc.nodes.map((n) => (n.id === "b" ? { ...n, label: "안에서 편집" } : n)),
    };
    expect(resolveSettings(changed, group)).toEqual([{ setting, value: "안에서 편집" }]);
  });
  it("retains bindings and live values through save and load", () => {
    const { doc } = fixture();
    expect(parseDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
  });
  it("remaps a duplicated subgraph's controls to the cloned nodes", () => {
    const { doc } = fixture();
    const result = pasteSelection(doc, copySelection(doc, ["g"]), {
      parent: null,
      position: { x: 1400, y: 100 },
    });
    const group = result.doc.nodes.find((n) => n.id === result.selected[0]);
    const setting = group?.exposedSettings?.[0];
    if (!group || !setting) throw new DocumentError("Missing cloned setting");
    expect(setting.nodeId).not.toBe("b");
    const changed = updateSettingValue(result.doc, group.id, { id: setting.id, value: "복제본" });
    expect(changed.nodes.find((n) => n.id === setting.nodeId)?.label).toBe("복제본");
    expect(changed.nodes.find((n) => n.id === "b")?.label).toBe("초안 작성");
    expect(parseDocument(changed)).toEqual(changed);
  });
  it("removes bindings whose internal node was deleted", () => {
    const { doc } = fixture();
    const changed = reconcileSubgraphs(removeItems(doc, ["b"]));
    expect(changed.nodes.find((n) => n.id === "g")?.exposedSettings).toEqual([]);
    expect(parseDocument(changed)).toEqual(changed);
  });
  it("rejects external node bindings and invalid file references", () => {
    const { doc, setting } = fixture();
    expect(exposeSetting(doc, "g", { nodeId: "a", property: "label" })).toBe(doc);
    const invalid = {
      ...doc,
      nodes: doc.nodes.map((n) =>
        n.id === "g" ? { ...n, exposedSettings: [{ ...setting, nodeId: "a" }] } : n,
      ),
    };
    expect(() => parseDocument(invalid)).toThrow(DocumentError);
  });
  it("validates color and node type values without corrupting the node", () => {
    const { doc } = fixture();
    const exposed = exposeSetting(
      exposeSetting(doc, "g", { nodeId: "b", property: "color" }),
      "g",
      { nodeId: "b", property: "shape" },
    );
    const settings = exposed.nodes.find((n) => n.id === "g")?.exposedSettings ?? [];
    const color = settings.find((s) => s.property === "color");
    const shape = settings.find((s) => s.property === "shape");
    if (!color || !shape) throw new DocumentError("Missing typed settings");
    expect(() => updateSettingValue(exposed, "g", { id: color.id, value: "invalid" })).toThrow(
      DocumentError,
    );
    const changed = updateSettingValue(exposed, "g", { id: shape.id, value: "decision" });
    expect(changed.nodes.find((n) => n.id === "b")?.shape).toBe("decision");
  });
});
