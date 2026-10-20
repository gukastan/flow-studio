import type { Document } from "./model";

export const SAMPLE = `flowchart TD
    A["입력"] --> B["요구사항 해석"]
    B --> C["사용 가능한 근거 정리"]
    C --> D["작성 전략과 구성 결정"]
    D --> E["초안 작성"]
    E --> F["검증 및 평가"]
    F --> G{"다음 행동 결정"}
    G -->|"기준 충족"| H["최종 결과"]
    G -->|"표현·분량 문제"| I["부분 수정"]
    I --> F
    G -->|"소재·논리 구조 문제"| D
    G -->|"근거 부족·수정 한도 도달"| J["보완 필요 결과"]`;

export const starter: Document = {
  format: "flow-studio",
  version: 1,
  title: "생각에서 결과까지",
  nodes: [
    {
      id: "a",
      kind: "node",
      label: "아이디어 수집",
      color: "#22d3ee",
      position: { x: 40, y: 160 },
      parent: null,
      collapsed: false,
      width: 224,
      height: 88,
      shape: "terminal",
    },
    {
      id: "g",
      kind: "group",
      label: "만들고 다듬기",
      color: "#a78bfa",
      position: { x: 340, y: 72 },
      parent: null,
      collapsed: false,
      width: 608,
      height: 264,
      shape: "process",
    },
    {
      id: "b",
      kind: "node",
      label: "초안 작성",
      color: "#a78bfa",
      position: { x: 372, y: 160 },
      parent: "g",
      collapsed: false,
      width: 224,
      height: 88,
      shape: "process",
    },
    {
      id: "c",
      kind: "node",
      label: "검토와 피드백",
      color: "#fbbf24",
      position: { x: 692, y: 160 },
      parent: "g",
      collapsed: false,
      width: 224,
      height: 88,
      shape: "decision",
    },
    {
      id: "d",
      kind: "node",
      label: "결과 완성",
      color: "#34d399",
      position: { x: 1056, y: 160 },
      parent: null,
      collapsed: false,
      width: 224,
      height: 88,
      shape: "terminal",
    },
  ],
  edges: [
    { id: "ab", source: "a", target: "b", label: "", dashed: false, arrow: true },
    { id: "bc", source: "b", target: "c", label: "구체화", dashed: false, arrow: true },
    { id: "cb", source: "c", target: "b", label: "다시 다듬기", dashed: true, arrow: true },
    { id: "cd", source: "c", target: "d", label: "완료", dashed: false, arrow: true },
  ],
};
