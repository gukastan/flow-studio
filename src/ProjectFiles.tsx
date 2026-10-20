import type { Document } from "./model";
import { SaveDialog } from "./SaveDialog";
import type { useProjectFiles } from "./useProjectFiles";

type Props = ReturnType<typeof useProjectFiles> & {
  readonly doc: Document;
  readonly onSaved: (message: string) => void;
};
export function ProjectFiles({ file, loadFile, saving, setSaving, doc, onSaved }: Props) {
  return (
    <>
      <input
        ref={file}
        type="file"
        accept=".json,.flow.json,application/json,.png,image/png"
        className="sr-only"
        aria-label="프로젝트 파일 선택"
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          if (chosen) void loadFile(chosen);
          event.target.value = "";
        }}
      />
      {saving && <SaveDialog doc={doc} onClose={() => setSaving(false)} onSaved={onSaved} />}
    </>
  );
}
