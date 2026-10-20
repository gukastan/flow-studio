# GitHub 저장소 안내

저장소: [gukastan/flow-studio](https://github.com/gukastan/flow-studio)

비공개 저장소이며 기본 브랜치는 `main`입니다.
이 문서와 `package.json`, `LICENSE`, `src/`가 들어 있는 폴더가 저장소의 루트입니다.

## 포함한 파일

- 앱 소스와 테스트, 빌드 설정, 의존성 잠금 파일.
- 바로 실행할 수 있는 `Flow-Studio.html`.
- `examples/subgraph-connections.flow.json` 예제.
- MIT `LICENSE`, 참고 출처 `CREDITS.md`, 외부 패키지 고지 `THIRD_PARTY_NOTICES.txt`.

설치된 패키지(`node_modules/`), 빌드 중간 폴더(`dist/`), 환경 설정 비밀값 파일,
로그와 운영체제 임시 파일은 `.gitignore`로 제외합니다.

## 개발과 업데이트

Node.js 22 이상과 pnpm을 사용합니다.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

수정 후 검사하고 실행용 HTML도 함께 갱신합니다.

```sh
pnpm test
pnpm build
cp dist/index.html Flow-Studio.html
git status
```

변경할 파일만 선택해서 커밋한 뒤 `main` 브랜치를 푸시합니다.

## 실행 파일 사용

GitHub에서 `Flow-Studio.html`을 열고 **Download raw file**로 다운로드합니다.
다운로드한 파일을 Chrome, Edge 또는 Safari에서 열면 됩니다.
예제 JSON은 앱의 **불러오기** 버튼으로 엽니다.

## 라이선스와 출처

직접 작성한 코드의 저작권 표기는 `Copyright (c) 2026 Flow Studio contributors`입니다.
외부 패키지에는 각 저작권자의 라이선스가 적용됩니다.
소스나 실행 파일을 재배포할 때 `LICENSE`, `CREDITS.md`,
`THIRD_PARTY_NOTICES.txt`를 함께 포함하세요.

Archify와 ComfyUI는 디자인·편집 방식의 참고 출처입니다.
원본 애플리케이션 코드나 로고를 복사한 포크가 아닙니다.
