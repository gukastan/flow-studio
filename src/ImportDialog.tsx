import { Code2, FileInput, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { importMermaid } from "./mermaid";
import type { Document } from "./model";
import { DocumentError } from "./model";
import { SAMPLE } from "./sample";

export function ImportDialog({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (doc: Document) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState(SAMPLE);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function submit() {
    setError("");
    setBusy(true);
    try {
      const doc = await importMermaid(code);
      onImport(doc);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof DocumentError
          ? reason.message
          : `Mermaid 문법을 확인해 주세요. 괄호와 연결 기호가 빠지지 않았는지 살펴보세요.\n\n${reason instanceof Error ? reason.message.slice(0, 500) : ""}`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="import-dialog"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      aria-labelledby="import-title"
    >
      <div className="dialog-heading">
        <div className="dialog-icon">
          <Code2 size={24} />
        </div>
        <div>
          <h2 id="import-title">Mermaid에서 시작하기</h2>
          <p>코드를 붙여넣으면 편집 가능한 흐름도로 바뀝니다.</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="닫기"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="editor-toolbar">
        <span>MERMAID · FLOWCHART</span>
        <button type="button" onClick={() => setCode(SAMPLE)}>
          예제 넣기
        </button>
      </div>
      <label className="sr-only" htmlFor="mermaid-code">
        Mermaid 코드
      </label>
      <textarea
        id="mermaid-code"
        className="code-editor"
        value={code}
        spellCheck={false}
        disabled={busy}
        onChange={(e) => setCode(e.target.value)}
      />
      {error && (
        <pre className="error-message" role="alert">
          {error}
        </pre>
      )}
      <div className="import-note">
        flowchart / graph · 한글 · 분기 · 반복 연결 · 중첩 subgraph 지원
        <br />
        노드 모양은 편집기 유형으로 단순화됩니다. 현재 캔버스를 교체하며 되돌리기가 가능합니다.
      </div>
      <div className="dialog-footer">
        <button type="button" disabled={busy} onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className="primary"
          disabled={busy || !code.trim()}
          onClick={() => void submit()}
        >
          <FileInput size={16} />
          {busy ? "변환하는 중…" : "캔버스로 가져오기"}
        </button>
      </div>
    </dialog>
  );
}
