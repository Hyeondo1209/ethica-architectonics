# Ethica Architectonics — CLAUDE.md

이 repo = 스피노자 『에티카』 1부(정리 1~15)를 걸어다니는 웹 3D 건축 공간으로 구현하는 개인 포트폴리오. 완결 = 1부 완성. 1차 용도 = 공모전·전시·공개. 마감 **2026.07.31**. 데스크톱 전용.

## 스택 (합의 없이 변경 금지)
React Three Fiber(Three.js) + Vite · three-bvh-csg(`HOLLOW_SUBTRACTION`) · 배포 Vercel(GitHub 자동 재배포). 절차 생성 · 손모델 없음. drei 기각(정리 텍스트 품질 문제 시에만 재론).

## 역할·권한 (중요)
- 현도 = 철학적 해석의 **최종 판단** · 미적 결정 · 파라미터 미세조정. 나(Claude Code) = 구조화·구현·비판적 검토·문서화.
- **현도의 독해를 멋대로 바꾸지 말 것.** 현도의 손 스케치는 반드시 리드백 → 현도 확인 후 구현.
- 현도는 3D/웹·터미널 초보. 무엇을 왜 하는지 초보가 이해하게 설명.

## 정본 3분할 (진실의 원천)
- 코드 = 이 repo. **수치의 정본 = `src/constants.js` 주석.**
- 설계 상태 = repo 루트 `DESIGN.md` (단일 정본, 세션마다 **고쳐 씀** — 덧붙이지 말 것).
- 연대기 = 노션 'Ethica Architectonics 프로젝트 일지' DB.

## 세션 시작 (일 시작 전 매번)
1. **`DESIGN.md` 제일 먼저 정독** + 주요 소스(`src/Dome.jsx`·`src/constants.js`·`src/ethica1.js`) + `git log` 확인.
2. **현재 그림을 리드백**하고 나서 작업 시작. 기억·인상이 문서와 어긋나면 **문서를 따른다**(기억은 늦게 갱신됨).
3. 세션 유형 = `DESIGN.md` §6 '다음 작업' + 최신 일지 '다음 할 일'로 판정. 결정 세션(설계·매핑)과 코드 세션을 구분.

## 일하는 방식
- **한 세션 = 산출물 하나.** 스코프 늘면 멈추고 경고. 16~36·모바일·사운드는 이번 범위 외.
- **한 번에 하나만 고친다** — 대각선/다축 수정 금지. 설계 충돌은 만들기 *전에* 플래그(발견 후가 아니라).
- **LOCKED 원칙**(상세 = `DESIGN.md` §1·§2-C): 리브만 실체·유일 · 얇고 우아 · 관 반경 6.0 내 · 비-리브 세로는 리브 혼동 금지 · **1p11 무한 공개 스포 금지**.

## 검증 (완료 선언 전 필수)
1. 파일별 문법: `npx -y esbuild "<파일>" --loader:.jsx=jsx --loader:.js=jsx --format=esm --bundle=false`
2. 실 `src/constants.js`를 import하는 Node `.mjs`로 의미·기하 검사(관 반경·이탈·간격 등)
3. `npm run build` (Vite) = **최종 권위 검사**
- ⚠ 상수 튜닝 후 HMR이 instancedMesh + `useLayoutEffect`(빈 deps)를 못 잡음 → 로컬에서 하드 리로드(Ctrl+Shift+R).

## Git (엄수)
- **나는 commit/push 하지 않는다.** Commit→Push는 **현도의 유일한 수동 단계**(GitHub Desktop). 코드 세션 당일 push 원칙.
- 파일은 로컬 작업트리에서 직접 편집. 편집 후 **무엇이 왜 바뀌었는지 현도에게 요약**하고 push 대상 파일을 명시.

## 세션 종료
1. `DESIGN.md` 갱신(덧붙이지 말고 고쳐 쓰기, 관련 섹션 전부).
2. 노션 일지 1건: ①오늘 한 일 ②현재 상태 ③다음 할 일 ④열린 결정. 제목 `YYYY.MM.DD Ethica Architectonics 프로젝트 일지 — <산출물 한 줄>`, '날짜' 속성 기입. *(노션 MCP가 이 환경에 연결돼 있을 때만 — 아니면 현도가 채팅에서 기록.)*
3. push 대상 파일 목록을 현도에게 명시.

## 로컬
`C:\Users\김현도\ethica-architectonics` · `npm run dev` → localhost:5173.

## 말투
솔직하고 구체적으로. 막연한 칭찬 말고 실질적 피드백.
