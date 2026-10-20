# 출처와 오픈소스 고지

Flow Studio에서 직접 작성한 코드와 문서는 [MIT 라이선스](LICENSE)로 제공합니다.
외부 패키지와 그 구성 요소에는 각 저작권자의 라이선스가 적용됩니다.
이 프로젝트의 MIT 라이선스가 외부 패키지의 라이선스나 저작권 고지를 대체하지 않습니다.

## 디자인·편집 방식 참고

| 프로젝트 | 참고한 부분 | 참고 자료 |
|---|---|---|
| [Archify](https://github.com/tt-a1i/archify) | 어두운 남색 작업 화면, 색상 체계, 캔버스와 패널의 구성 | [디자인 문서 — 참고한 커밋](https://github.com/tt-a1i/archify/blob/25cf37080fc8b1dbe758a4efc3935b55f3327083/DESIGN.md) |
| [ComfyUI 프런트엔드](https://github.com/Comfy-Org/ComfyUI_frontend) | 노드 이동과 연결, 그룹화, 서브그래프 접기·펼치기의 편집 방식 | [공식 저장소](https://github.com/Comfy-Org/ComfyUI_frontend) |

Flow Studio는 위 프로젝트를 참고하여 독립적으로 구현했습니다.
두 프로젝트의 애플리케이션 소스 코드나 로고는 포함하지 않았습니다.
Flow Studio는 Archify 또는 ComfyUI의 공식 제품이나 포크가 아닙니다.

Archify의 원본 라이선스는 [MIT](https://github.com/tt-a1i/archify/blob/main/LICENSE),
ComfyUI 프런트엔드의 원본 라이선스는 [GPL-3.0](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/LICENSE)입니다.
이 표기는 참고 프로젝트를 식별하기 위한 것이며, 해당 코드의 재배포를 뜻하지 않습니다.

## 실제 사용한 주요 라이브러리

아래 버전은 이 배포를 준비할 때 설치된 버전입니다. 재현 가능한 의존성 목록은
`pnpm-lock.yaml`에 기록되어 있습니다.

| 패키지 | 버전 | 용도 | 패키지에 명시된 라이선스 |
|---|---|---|---|
| [React](https://github.com/facebook/react) / React DOM | 19.3.1 | 화면 구성 | MIT |
| [React Flow — @xyflow/react](https://github.com/xyflow/xyflow) | 12.12.0 | 노드·연결선 캔버스 | MIT |
| [Mermaid](https://github.com/mermaid-js/mermaid) | 11.17.2 | Mermaid 코드 해석 | MIT |
| [Dagre](https://github.com/dagrejs/dagre) | 1.1.8 | 그래프 자동 배치 | MIT |
| [Zod](https://github.com/colinhacks/zod) | 4.6.7 | 저장 파일 검증 | MIT |
| [Lucide React](https://github.com/lucide-icons/lucide) | 0.468.0 | 아이콘 | ISC; Feather 유래 부분의 MIT 고지도 포함 |

개발 도구 및 간접 의존성을 포함한 패키지별 저작권·라이선스 고지는
[THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)에 수록했습니다.
이 파일은 배포 준비 시 설치된 패키지의 라이선스 정보와 고지문을 모은 것이므로,
개발 도구에 대한 항목이 실행용 HTML에 해당 도구가 포함되었다는 뜻은 아닙니다.

## 재배포할 때

- 소스와 실행 파일을 배포할 때 `LICENSE`와 `THIRD_PARTY_NOTICES.txt`를 함께 제공합니다.
- 참고 출처를 보존하기 위해 이 `CREDITS.md`도 함께 제공합니다.
- 패키지를 추가하거나 버전을 바꾸면 해당 패키지 및 간접 의존성의 고지문도 갱신합니다.
- 원본 프로젝트 코드를 새로 가져오는 경우에는 그 코드에 적용되는 라이선스 조건을 별도로 확인합니다.
