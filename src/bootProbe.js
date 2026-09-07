//  ★216-e 부팅 스톱워치 장부 (의존성 0 — Room·Corridor·CoordHud가 함께 import한다)
//  값 무접촉: performance.now() 읽기와 덧셈뿐. 기하·색·재질에 손대지 않는다.
//  게이트: BootProbe(CoordHud.jsx) 렌더가 DEV_TELEPORT를 보고 BOOT.on을 켠다 — 렌더는 모든 useFrame보다
//   앞서므로 패스들이 돌 때는 이미 결정돼 있다. 배포본(DEV_TELEPORT=false) = on=false → 전부 no-op.
//  ⚠여기 스톱워치는 '무엇이 오래 걸리나'를 재는 것이지 처방이 아니다(★216 교훈: 프로파일 없이 처방 금지).
export const BOOT = { on: false, frame: 0, marks: {}, passes: {} }

//  게이트 켜기 — 렌더 본문에서 모듈 객체를 직접 대입하면 react-compiler 린트가 막는다(함수 호출은 허용)
export function bootEnable(v) { BOOT.on = !!v }

//  패스 시작 — 켜져 있으면 시각, 아니면 0(호출부는 값을 그대로 bootPass에 되돌려 준다)
export const bootNow = () => (BOOT.on ? performance.now() : 0)

//  패스 종료 — 이름별로 ms·회수·처음 돈 프레임 번호를 누적한다
export function bootPass(name, t0) {
  if (!BOOT.on) return
  const d = performance.now() - t0
  const p = BOOT.passes[name] || (BOOT.passes[name] = { ms: 0, n: 0, frame: BOOT.frame })
  p.ms += d; p.n++
}

//  구간 표식(렌더 끝·커밋 끝·첫 useFrame·첫 렌더 끝) — 같은 이름은 마지막 값이 남는다(StrictMode 2회 호출 = 뒤가 실제 커밋분)
export function bootMark(name) {
  if (!BOOT.on) return
  BOOT.marks[name] = performance.now()
}
