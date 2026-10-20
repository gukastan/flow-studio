import { useCallback, useEffect, useRef, useState } from "react";
import { fitGroups } from "./graph";
import type { Document } from "./model";
import { loadInitial, persist } from "./storage";
import { reconcileSubgraphs } from "./subgraphPorts";

export function useDocument() {
  const [initial] = useState(loadInitial);
  const [doc, setDoc] = useState(initial.doc);
  const [warning, setWarning] = useState(initial.warning);
  const past = useRef<Document[]>([]);
  const future = useRef<Document[]>([]);
  const current = useRef(doc);
  const dragStart = useRef<Document | null>(null);
  const commit = useCallback((next: Document | ((d: Document) => Document)) => {
    const value = typeof next === "function" ? next(current.current) : next;
    if (value === current.current) return;
    past.current = [...past.current.slice(-79), current.current];
    future.current = [];
    current.current = fitGroups(reconcileSubgraphs(value));
    setDoc(current.current);
  }, []);
  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(current.current);
    current.current = previous;
    setDoc(previous);
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(current.current);
    current.current = next;
    setDoc(next);
  }, []);
  const startDrag = useCallback(() => {
    dragStart.current = current.current;
  }, []);
  const drag = useCallback(
    (transform: (d: Document) => Document) => {
      if (!dragStart.current) {
        commit(transform);
        return;
      }
      const next = transform(current.current);
      current.current = next;
      setDoc(next);
    },
    [commit],
  );
  const endDrag = useCallback(() => {
    if (dragStart.current && dragStart.current !== current.current) {
      past.current = [...past.current.slice(-79), dragStart.current];
      future.current = [];
    }
    dragStart.current = null;
    setDoc({ ...current.current });
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setWarning(persist(doc)), 400);
    return () => clearTimeout(timer);
  }, [doc]);
  return {
    doc,
    commit,
    undo,
    redo,
    drag,
    startDrag,
    endDrag,
    warning,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
