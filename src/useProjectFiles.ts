import { useCallback, useRef, useState } from "react";
import type { Document } from "./model";
import { readProject } from "./storage";

type Options = {
  readonly replace: (doc: Document) => void;
  readonly notice: (message: string) => void;
};
export function useProjectFiles({ replace, notice }: Options) {
  const file = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const save = useCallback(() => setSaving(true), []);
  async function loadFile(chosen: File) {
    try {
      replace(await readProject(chosen));
      notice("프로젝트의 위치, 색상, 그룹과 접힌 상태를 불러왔습니다.");
    } catch (error) {
      if (error instanceof Error) notice(`불러오기 실패: ${error.message}`);
      else throw error;
    }
  }
  return { file, saving, setSaving, save, loadFile };
}
