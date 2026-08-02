// defPitGeometry.js — ★101 정의 각뿔대(팔각 역각뿔대) **블록아웃** (2026.08.02 현도 그림)
//  현도 그림: "정의·공리의 방 바닥을 8각형 각뿔대로 판다. 그 각뿔대의 각 면을 또 수평으로 파서
//   거기에 각각의 정의를 배치한다."  → 이번 조각은 **각뿔대 매스만**(감실·계단·시작점 이설은 다음).
//  목적 = 현도가 로컬에서 **깊이·상면·하면 사이즈감**을 밀어 보는 것. 그래서 셋 다 노브다.
//
//  ★기하가 정한 것(노브 아님):
//   ⓐ **방위는 파생이다.** 정의 8기가 *면*에 들어가려면 면 중심 방위 = 현 선돌 방위(22.5°+k·45°)
//     여야 한다. 그러면 세로 모서리가 0°·45°·90°…에 온다 → **+x가 모서리**이고, 그건 현 옥타곤의
//     '틈 = 출발 축'이자 공리 나선 발치(r45)의 정렬 축이다. 현도가 말한 "모서리 하나에 계단"의
//     후보가 기하학적으로 이미 서 있다. (`PIT_PHASE = 0` = 모서리 방위 시작.)
//   ⓑ **경사는 파생이다.** 상면·하면·깊이 셋이 정해지면 옆면 경사는 계산된다(노브 아님).
//   ⓒ **하면은 사발 바닥이 아니다.** 현도 "중간쯤에서 끊는게 좋을 것 같아" → 각뿔대 밑으로 사발이
//     남는다. 그 잔여 공간은 개구 0·접근 0인 **봉인 공간**이다(§7 구속 '개구는 판에만' 무손상).
//
//  ★법선: 팔각 패싯이므로 **평면 법선이 옳다.** `computeVertexNormals()`를 쓰지 않고 면마다 직접
//   찍는다('각진 연필' 사고의 역 — 여기선 각져야 맞다. 검사가 법선 편차를 잰다).
//
//  ⚠수치 정본 = constants.js PIT 블록 주석. 여기엔 '어떻게'만 둔다.
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three'
import {
  PIT_SIDES, PIT_PHASE, PIT_R_TOP, PIT_R_BOT, PIT_DEPTH, PIT_WALL_T, PIT_FLOOR_T,
  ROOM_FLOOR_Y, ROOM_R, ROOM_HEIGHT, ROOM_FLOOR_LIFT, wallR,
  ROOM_STAIR_ROUT, ROOM_STAIR_WIDTH, DAIS_R, DAIS_STEP_IN, DAIS_STEPS,
} from './constants.js'

// ── 스펙(단일 유도점) — 검사·웨이포인트·Room.jsx가 전부 여기서 읽는다(사본 금지) ──
export function pitSpec() {
  const N     = PIT_SIDES
  const yTop  = ROOM_FLOOR_Y + ROOM_FLOOR_LIFT       // 판 **윗면**(밟는 면) — 구멍이 뚫리는 높이
  const yBot  = yTop - PIT_DEPTH                     // 각뿔대 바닥 윗면(밟는 면)
  const rTop  = PIT_R_TOP                            // 상면 **외접**반경(꼭짓점까지)
  const rBot  = PIT_R_BOT                            // 하면 외접반경
  const rRim  = rTop + PIT_WALL_T                    // 옆벽 바깥면 = **판 구멍 반경**(테두리 띠 폭 = PIT_WALL_T)
  const cosH  = Math.cos(Math.PI / N)                // 외접 → 내접(apothem) 계수
  return {
    N, yTop, yBot, rTop, rBot, rRim,
    depth:      PIT_DEPTH,
    apoTop:     rTop * cosH,                         // 상면 내접반경 = 면 중심까지 거리
    apoBot:     rBot * cosH,
    sideTop:    2 * rTop * Math.sin(Math.PI / N),    // 상면 한 변 길이
    sideBot:    2 * rBot * Math.sin(Math.PI / N),
    // 옆면: 수평으로 (rTop−rBot) 물러나며 PIT_DEPTH 내려간다 → 수평 기준 경사각
    slopeDeg:   Math.atan2(PIT_DEPTH, rTop - rBot) * 180 / Math.PI,
    faceH:      Math.hypot(rTop - rBot, PIT_DEPTH),  // 경사면 위에서 잰 면의 실제 높이
    floorBotY:  yBot - PIT_FLOOR_T,                  // 바닥 슬래브 밑면
    // 면 중심 방위(라디안) — 정의 D1~D8이 앉을 자리. 현 선돌 방위와 같아야 한다(검사가 잠근다).
    faceAz:     Array.from({ length: N }, (_, i) => PIT_PHASE + (i + 0.5) * (2 * Math.PI / N)),
    // 세로 모서리 방위 — 상승 계단 후보(현도: "모서리 중 하나에 계단")
    edgeAz:     Array.from({ length: N }, (_, i) => PIT_PHASE + i * (2 * Math.PI / N)),
    // 사발 셸 여유(최소) — 각뿔대 바깥면이 방 아랫반 내면을 건드리지 않는가
    shellGap:   pitProbe().shellGap,
    bowlBotY:   ROOM_FLOOR_Y - ROOM_HEIGHT,          // 사발 최하점(구 아랫반 극)
  }
}

//  ★파라메트릭 탐침 — **노브를 밀기 전에** 그 조합이 성립하는지 잰다.
//   현도가 깊이·상면·하면 셋을 로컬에서 밀어 보므로, 검사가 **조합 격자 전체**를 미리 훑는다
//   (DESIGN §7 스윕 표의 근거. 눈대중 금지 = 측정 규율).
export function pitProbe({ depth = PIT_DEPTH, rTop = PIT_R_TOP, rBot = PIT_R_BOT,
                           wallT = PIT_WALL_T, floorT = PIT_FLOOR_T } = {}) {
  const yTop = ROOM_FLOOR_Y + ROOM_FLOOR_LIFT, yBot = yTop - depth
  const cosH = Math.cos(Math.PI / PIT_SIDES)
  let shellGap = Infinity
  for (let k = 0; k <= 200; k++) {                   // 전 깊이 스캔(끝점만 재면 중간이 새는 전례)
    const t = k / 200
    const y = yTop + (yBot - yTop) * t
    const rOut = (rTop + (rBot - rTop) * t) + wallT
    shellGap = Math.min(shellGap, wallR(y) - rOut)   // wallR = 타원구 내면 반경(상·하 대칭)
  }
  const daisTopR = DAIS_R - DAIS_STEP_IN * (DAIS_STEPS - 1)
  return {
    shellGap,                                        // 각뿔대 바깥면 ↔ 방 아랫반 셸 내면
    bowlGap:  (yBot - floorT) - (ROOM_FLOOR_Y - ROOM_HEIGHT),   // 바닥 슬래브 밑면 ↔ 사발 최하점(>0 = "중간에서 끊김")
    stairGap: ROOM_STAIR_ROUT - ROOM_STAIR_WIDTH / 2 - (rTop + wallT),  // 판 구멍 ↔ 나선 최하 디딤판 바깥끝
    daisGap:  daisTopR - (rTop + wallT),             // 기단 최상단이 고리로 남는 폭
    floorD:   2 * rBot * cosH,                       // 하면 통행 지름(내접 기준 = 마주 보는 두 면 사이)
    slopeDeg: Math.atan2(depth, rTop - rBot) * 180 / Math.PI,
  }
}

// ── 폴리곤 헬퍼 ──
const ring = (r, y, N, phase) =>
  Array.from({ length: N }, (_, i) => {
    const a = phase + i * (2 * Math.PI / N)
    return [r * Math.cos(a), y, r * Math.sin(a)]
  })

//  정N각형(외접반경 R·위상 φ)의 방위각 θ에서의 반경 — 96각 원판을 8각 구멍에 꿰맬 때 쓴다.
export const polyRadiusAt = (theta, R, N, phase) => {
  const step = 2 * Math.PI / N
  let w = (theta - phase) % step
  if (w < 0) w += step
  return R * Math.cos(Math.PI / N) / Math.cos(w - Math.PI / N)
}

// 사각형 하나(a→b→c→d)를 삼각형 둘로. 법선은 호출자가 준다(평면 법선 — 패싯 보존).
function quad(P, Nn, a, b, c, d, n) {
  for (const v of [a, b, c, a, c, d]) P.push(v[0], v[1], v[2])
  for (let i = 0; i < 6; i++) Nn.push(n[0], n[1], n[2])
}
const sub  = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (v) => { const L = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / L, v[1] / L, v[2] / L] }
const faceN = (a, b, c) => norm(cross(sub(b, a), sub(c, a)))

function finish(P, Nn) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3))
  g.setAttribute('normal',   new THREE.BufferAttribute(new Float32Array(Nn), 3))   // ⚠computeVertexNormals 금지(패싯)
  g.computeBoundingSphere()
  return g
}

// ── ① 각뿔대 옆벽(경사면) — **밟는 면이 아니다**(62° 빗면). 두께 PIT_WALL_T로 §2-D 2 '종잇장 금지'.
//   ⚠입술 띠는 여기 없다 — 그건 수평이고 실제로 밟으므로 **다른 메시**(buildPitRim)로 뗀다.
//    한 메시에 몰면 `walkable` 태그 하나가 빗면까지 밟게 만든다(W4 인구조사가 그걸 잡는다).
export function buildPitWalls() {
  const s = pitSpec(), N = s.N, P = [], Nn = []
  const iT = ring(s.rTop, s.yTop, N, PIT_PHASE)                  // 안쪽 위
  const iB = ring(s.rBot, s.yBot, N, PIT_PHASE)                  // 안쪽 아래
  const oT = ring(s.rRim, s.yTop, N, PIT_PHASE)                  // 바깥 위
  const oB = ring(s.rBot + PIT_WALL_T, s.yBot, N, PIT_PHASE)     // 바깥 아래
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N
    // 안쪽 면(보이는 면 — 정의 감실이 앞으로 여기에 파인다). 축을 향한다
    quad(P, Nn, iT[i], iT[j], iB[j], iB[i], faceN(iT[i], iT[j], iB[j]))
    // 바깥 면(사발 봉인 공간 쪽 — 아무도 못 보지만 닫아 둔다)
    quad(P, Nn, oT[j], oT[i], oB[i], oB[j], faceN(oT[j], oT[i], oB[i]))
    // 밑띠(아래, 수평)
    quad(P, Nn, iB[j], oB[j], oB[i], iB[i], [0, -1, 0])
  }
  return finish(P, Nn)
}

// ── ①-b 입술 띠(rTop~rRim, 수평, 판과 같은 높이) = 구멍의 두꺼운 테두리. **밟는 면.** ──
//   판 고리(rRim~ROOM_R)와 정확히 이어 붙는다 — 겹침 0·틈 0(둘 다 rRim에서 만난다).
export function buildPitRim() {
  const s = pitSpec(), N = s.N, P = [], Nn = []
  const iT = ring(s.rTop, s.yTop, N, PIT_PHASE)
  const oT = ring(s.rRim, s.yTop, N, PIT_PHASE)
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N
    quad(P, Nn, iT[i], oT[i], oT[j], iT[j], [0, 1, 0])
  }
  return finish(P, Nn)
}

// ── ② 각뿔대 바닥 슬래브(팔각 프리즘) — 밟는 면 ──
//   봉인: 반경을 옆벽 안쪽면보다 SEAL만큼 키워 물린다(★64 교훈 — 딱 맞추면 헤어라인 틈).
const FLOOR_SEAL = 0.05
export function buildPitFloor() {
  const s = pitSpec(), N = s.N, P = [], Nn = []
  const R = s.rBot + FLOOR_SEAL
  const top = ring(R, s.yBot, N, PIT_PHASE)
  const bot = ring(R, s.floorBotY, N, PIT_PHASE)
  const cT = [0, s.yBot, 0], cB = [0, s.floorBotY, 0]
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N
    for (const v of [cT, top[i], top[j]]) P.push(v[0], v[1], v[2])          // 윗면(부채)
    for (let k = 0; k < 3; k++) Nn.push(0, 1, 0)
    for (const v of [cB, bot[j], bot[i]]) P.push(v[0], v[1], v[2])          // 밑면
    for (let k = 0; k < 3; k++) Nn.push(0, -1, 0)
    quad(P, Nn, top[i], bot[i], bot[j], top[j], faceN(top[i], bot[i], bot[j]))  // 옆면
  }
  return finish(P, Nn)
}

// ── ③ 구멍 뚫린 원판/슬래브 — 방 주 바닥(두께 0)과 성역 기단 2단(두께 有)이 같은 기계를 쓴다 ──
//   바깥은 원(outSegs 등분), 안쪽은 정N각형. 같은 방위각에서 두 반경을 재 꿰맨다.
//   thickness = 0 → 평판(DoubleSide 전제) · > 0 → 닫힌 슬래브(윗면 y=0 기준, 아래로 압출).
export function buildHoledSlab(rOut, outSegs, rHole, holeSides, holePhase, thickness = 0) {
  const P = [], Nn = []
  const th = [], out = [], inn = []
  for (let k = 0; k <= outSegs; k++) {
    const a = k * 2 * Math.PI / outSegs
    th.push(a)
    out.push([rOut * Math.cos(a), 0, rOut * Math.sin(a)])
    const rp = polyRadiusAt(a, rHole, holeSides, holePhase)
    inn.push([rp * Math.cos(a), 0, rp * Math.sin(a)])
  }
  const drop = (v) => [v[0], -thickness, v[2]]
  for (let k = 0; k < outSegs; k++) {
    quad(P, Nn, out[k], out[k + 1], inn[k + 1], inn[k], [0, 1, 0])                       // 윗면 고리
    if (thickness > 0) {
      quad(P, Nn, drop(out[k + 1]), drop(out[k]), drop(inn[k]), drop(inn[k + 1]), [0, -1, 0])   // 밑면
      quad(P, Nn, out[k + 1], out[k], drop(out[k]), drop(out[k + 1]),                            // 바깥 옆면
        faceN(out[k + 1], out[k], drop(out[k])))
      quad(P, Nn, inn[k], inn[k + 1], drop(inn[k + 1]), drop(inn[k]),                            // 안쪽 옆면(구멍 벽)
        faceN(inn[k], inn[k + 1], drop(inn[k + 1])))
    }
  }
  return finish(P, Nn)
}
