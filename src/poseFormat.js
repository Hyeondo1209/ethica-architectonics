//  ════════ ★99 좌표 교환 포맷 — 단일 정본 (2026.08.01) ════════
//  왜: 현도가 로컬에서 본 지점을 Claude에게 말로 옮기는 비용이 이 프로젝트의 실제 고정비였다.
//   "박스 목 근처"·"제단 위쪽"·"전망대"가 매번 다르게 읽혔고, 2026.08.01 하루에만 세 번 어긋났다.
//   → 화면이 좌표를 뱉고, 그 문자열이 **그대로** 렌더 도구에 먹으면 오해가 원천 소멸한다.
//
//  ⚠이 모듈이 존재하는 진짜 이유 = **단위 사고의 구조적 봉인**.
//   `render_views.mjs free:`는 yaw·pitch를 **도(°)**로 받고, `waypoints.js`는 **라디안**으로 저장한다.
//   2026.08.01 Claude가 라디안을 free:에 넣어 정면만 찍힌 렌더를 보고 "도구가 고장났다"고 오진했다.
//   → 뱉는 쪽(HUD)과 먹는 쪽(render_views)이 **같은 함수**를 쓰게 해서 사본을 없앤다.
//   check_waypoints Y절이 왕복(format → parse)을 상시 검증한다.
//
//  ⚠JSX·three·React 임포트 금지 — .mjs 검사 스크립트가 그대로 import 한다.

const DEG = 180 / Math.PI
const r = (v, n = 2) => {
  const m = 10 ** n
  //  −0 방지(문자열에 '-0'이 찍히면 파서는 통과하나 사람이 읽을 때 혼란)
  const q = Math.round(v * m) / m
  return q === 0 ? 0 : q
}

//  ★렌더 도구 인자 — `node src/render_views.mjs "free:x,y,z,yaw°,pitch°"` 에 그대로 붙는다.
//   pose = { x, y, z, yaw, pitch } · yaw·pitch는 **라디안**(카메라 실값) — 여기서 도로 변환한다.
export function formatFree(pose, ribs = false) {
  const { x, y, z, yaw, pitch } = pose
  return `free:${r(x)},${r(y)},${r(z)},${r(yaw * DEG, 1)},${r(pitch * DEG, 1)}` + (ribs ? ',ribs' : '')
}

//  ★웨이포인트 등록용 — waypoints.js WAYPOINTS 배열에 그대로 붙는 한 줄(라디안 보존).
export function formatWaypoint(pose, id = 'tmp', label = '임시 지점') {
  const { x, y, z, yaw, pitch } = pose
  return `{ id: '${id}', group: '임시', label: '${label}', x: ${r(x)}, y: ${r(y)}, z: ${r(z)}, ` +
         `yaw: ${r(yaw, 4)}, pitch: ${r(pitch, 4)} },`
}

//  ★파서 — render_views.mjs가 이걸 쓴다(인라인 파싱 폐기 = 사본 소멸).
//   반환 yaw·pitch는 **라디안**(render()가 라디안을 받으므로 경계를 여기서 끝낸다).
//   유효하지 않으면 null — 호출부가 사용법을 찍고 멈추게.
export function parseFree(arg) {
  if (typeof arg !== 'string' || !arg.startsWith('free:')) return null
  const parts = arg.slice(5).split(',').map(s => s.trim())
  const ribs = parts[parts.length - 1] === 'ribs'
  const nums = (ribs ? parts.slice(0, -1) : parts).map(Number)
  if (nums.length < 3 || nums.length > 5 || nums.some(v => !Number.isFinite(v))) return null
  const [x, y, z, yawDeg = 0, pitchDeg = 0] = nums
  return { x, y, z, yaw: yawDeg / DEG, pitch: pitchDeg / DEG, ribs }
}

//  ★사람이 읽는 줄 — HUD 상단. 발밑 = 눈높이에서 EYE를 뺀 값(호출부가 준다).
export function formatHuman(pose, feetY) {
  const { x, y, z, yaw, pitch } = pose
  return `x ${r(x, 1)}  y ${r(y, 1)}  z ${r(z, 1)}   (발밑 y ${r(feetY, 1)})   ` +
         `yaw ${r(yaw * DEG, 1)}°  pitch ${r(pitch * DEG, 1)}°`
}
