import { Download, FileJson, Image, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { exportImage } from "./exportImage";
import type { Document } from "./model";
import { download, downloadBlob } from "./storage";

type Props = {
  readonly doc: Document;
  readonly onClose: () => void;
  readonly onSaved: (message: string) => void;
};
export function SaveDialog({ doc, onClose, onSaved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function savePng() {
    setBusy(true);
    setError("");
    try {
      downloadBlob(await exportImage(doc), `${doc.title}.flow.png`);
      onSaved("PNG를 저장했습니다. 파일을 캔버스에 놓거나 ‘불러오기’로 다시 편집할 수 있습니다.");
      onClose();
    } catch (reason) {
      if (reason instanceof Error) setError(`이미지 저장 실패: ${reason.message}`);
      else throw reason;
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="import-dialog save-dialog"
      aria-labelledby="save-title"
      aria-busy={busy}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <div className="dialog-heading">
        <div className="dialog-icon">
          <Download size={24} />
        </div>
        <div>
          <h2 id="save-title">파일로 저장</h2>
          <p>원하는 저장 형식을 선택하세요.</p>
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
      <div className="save-options">
        <button
          type="button"
          className="save-option"
          disabled={busy}
          onClick={() => {
            download(doc);
            onSaved("프로젝트 JSON 파일을 저장했습니다.");
            onClose();
          }}
        >
          <FileJson size={24} />
          <span>
            <strong>프로젝트 JSON</strong>
            <small>노드·연결·그룹을 그대로 보관하고 다시 편집합니다.</small>
          </span>
        </button>
        <button
          type="button"
          className="save-option"
          disabled={busy || !doc.nodes.length}
          onClick={() => void savePng()}
        >
          <Image size={24} />
          <span>
            <strong>{busy ? "이미지를 만드는 중…" : "이미지 PNG"}</strong>
            <small>
              현재 흐름을 이미지로 저장합니다. 전체 프로젝트가 포함되어 다시 편집할 수 있습니다.
            </small>
          </span>
        </button>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <p className="import-note">
        PNG를 캔버스에 놓으면 노드와 연결선이 복원됩니다.
        <br />
        다른 앱에서 이미지를 수정·압축하면 편집 데이터가 사라질 수 있습니다.
      </p>
    </dialog>
  );
}
