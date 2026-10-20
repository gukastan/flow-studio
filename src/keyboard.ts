export function isTextEditing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.matches(
      "textarea, select, input:not([type=checkbox]):not([type=radio]):not([type=button])",
    ) ||
      target.isContentEditable)
  );
}

export function hasOpenOverlay(): boolean {
  return !!document.querySelector("dialog[open], [role=menu]");
}
