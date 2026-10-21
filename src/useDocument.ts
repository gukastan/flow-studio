import { useCallback, useEffect, useRef, useState } from "react";
import { fitGroups } from "./graph";
import type { Document } from "./model";
import { DocumentError, emptyDocument } from "./model";
import { reconcileSubgraphs } from "./subgraphPorts";
import type { Workflow } from "./workflowStorage";
import { loadWorkflows, persistWorkflows } from "./workflowStorage";

type History = Workflow & {
  readonly past: readonly Document[];
  readonly future: readonly Document[];
  readonly dragStart: Document | null;
};
type Session = { readonly activeId: string; readonly items: readonly History[] };

function createWorkflow(title: string): History {
  return {
    id: crypto.randomUUID(),
    doc: { ...emptyDocument, title },
    past: [],
    future: [],
    dragStart: null,
  };
}

export function useDocument() {
  const [initial] = useState(loadWorkflows);
  const [session, setSession] = useState<Session>(() => ({
    activeId: initial.activeId,
    items: initial.items.map((item) => ({ ...item, past: [], future: [], dragStart: null })),
  }));
  const [warning, setWarning] = useState(initial.warning);
  const current = useRef(session);
  const activeId = session.activeId;
  const active = session.items.find((item) => item.id === activeId);
  if (!active) throw new DocumentError("선택한 워크플로우를 찾을 수 없습니다.");
  const update = useCallback((transform: (value: Session) => Session) => {
    const next = transform(current.current);
    if (next === current.current) return;
    current.current = next;
    setSession(next);
  }, []);
  const change = useCallback(
    (transform: (value: History) => History) =>
      update((value) => {
        const items = value.items.map((item) => (item.id === activeId ? transform(item) : item));
        return items.every((item, index) => item === value.items[index])
          ? value
          : { ...value, items };
      }),
    [activeId, update],
  );
  const commit = useCallback(
    (next: Document | ((doc: Document) => Document)) => {
      change((item) => {
        const doc = typeof next === "function" ? next(item.doc) : next;
        if (doc === item.doc) return item;
        return {
          ...item,
          doc: fitGroups(reconcileSubgraphs(doc)),
          past: [...item.past.slice(-79), item.doc],
          future: [],
        };
      });
    },
    [change],
  );
  const undo = useCallback(() => {
    change((item) => {
      const doc = item.past.at(-1);
      return doc
        ? { ...item, doc, past: item.past.slice(0, -1), future: [...item.future, item.doc] }
        : item;
    });
  }, [change]);
  const redo = useCallback(() => {
    change((item) => {
      const doc = item.future.at(-1);
      return doc
        ? { ...item, doc, past: [...item.past, item.doc], future: item.future.slice(0, -1) }
        : item;
    });
  }, [change]);
  const startDrag = useCallback(() => {
    change((item) => ({ ...item, dragStart: item.doc }));
  }, [change]);
  const drag = useCallback(
    (transform: (doc: Document) => Document) => {
      change((item) => {
        const next = transform(item.doc);
        if (next === item.doc) return item;
        return {
          ...item,
          doc: item.dragStart ? next : fitGroups(reconcileSubgraphs(next)),
          past: item.dragStart ? item.past : [...item.past.slice(-79), item.doc],
          future: [],
        };
      });
    },
    [change],
  );
  const endDrag = useCallback(() => {
    change((item) => ({
      ...item,
      past:
        item.dragStart && item.dragStart !== item.doc
          ? [...item.past.slice(-79), item.dragStart]
          : item.past,
      dragStart: null,
    }));
  }, [change]);
  const selectWorkflow = useCallback(
    (id: string) => {
      update((value) =>
        value.activeId !== id && value.items.some((item) => item.id === id)
          ? { ...value, activeId: id }
          : value,
      );
    },
    [update],
  );
  const addWorkflow = useCallback(() => {
    update((value) => {
      let number = value.items.length + 1;
      while (value.items.some((item) => item.doc.title === `워크플로우 ${number}`)) number += 1;
      const workflow = createWorkflow(`워크플로우 ${number}`);
      return {
        activeId: workflow.id,
        items: [...value.items, workflow],
      };
    });
  }, [update]);
  const closeWorkflow = useCallback(
    (id: string) => {
      update((value) => {
        const index = value.items.findIndex((item) => item.id === id);
        if (index < 0) return value;
        const items = value.items.filter((item) => item.id !== id);
        const neighbor = items[index] ?? items[index - 1];
        if (!neighbor) {
          const workflow = createWorkflow("워크플로우 1");
          return { activeId: workflow.id, items: [workflow] };
        }
        return { activeId: value.activeId === id ? neighbor.id : value.activeId, items };
      });
    },
    [update],
  );
  useEffect(() => {
    function save(value: Session) {
      setWarning(
        persistWorkflows({
          activeId: value.activeId,
          items: value.items.map(({ id, doc }) => ({ id, doc })),
        }),
      );
    }
    const timer = setTimeout(() => save(session), 400);
    const flush = () => save(current.current);
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
    };
  }, [session]);
  return {
    doc: active.doc,
    commit,
    undo,
    redo,
    drag,
    startDrag,
    endDrag,
    warning,
    canUndo: active.past.length > 0,
    canRedo: active.future.length > 0,
    activeId,
    workflows: session.items.map(({ id, doc }) => ({
      id,
      title: doc.title,
      hasContent: doc.nodes.length > 0 || doc.edges.length > 0,
    })),
    selectWorkflow,
    addWorkflow,
    closeWorkflow,
  };
}
