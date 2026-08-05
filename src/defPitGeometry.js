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
  NICHE_ON, NICHE_FLOOR, NICHE_BACK, NICHE_DEPTH, NICHE_SILL, NICHE_W_F, NICHE_H_F,
  NICHE_STAIR_DEG, NICHE_RISE, NICHE_STEP_R, NICHE_APP_WIDE,
  SLOT_ON, SLOT_EDGE, SLOT_W, SLOT_BACK_R,
  SLOT_STAIR, SLOT_LANDING, SLOT_LANE_GAP, SLOT_SLAB_T, SLOT_STEP_R, SLOT_STAIR_INSET, SLOT_SPIRAL_PAD,
  ROOM_STAIR_ROUT as _RSR, ROOM_STAIR_WIDTH as _RSW,
  EAVE_ON, EAVE_LEN, EAVE_TILT, EAVE_T0, EAVE_T1, EAVE_SLOT_CLR,
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
    //  ★★면과 모서리는 다른 값이다(2026.08.02 정정 — 구 `slopeDeg`/`faceH`는 사실 모서리 값이었다).
    //   면(사다리꼴)의 높이·기울기는 **내접반경**으로 잰다. 감실 입구가 면 평면 안에 눕으므로 정본은 이쪽.
    faceDip:    Math.atan2(PIT_DEPTH, rTop * cosH - rBot * cosH) * 180 / Math.PI,   // 65.20°
    faceSlant:  Math.hypot((rTop - rBot) * cosH, PIT_DEPTH),                        // 26.44
    //   모서리(꼭짓점을 잇는 다리)는 **외접반경**으로 잰다 — 상승 계단이 앉을 후보축이다.
    edgeDeg:    Math.atan2(PIT_DEPTH, rTop - rBot) * 180 / Math.PI,                  // 63.43°
    edgeLen:    Math.hypot(rTop - rBot, PIT_DEPTH),                                  // 26.83
    //   높이 y에서의 내접반경(면까지의 수직거리)과 면 반폭 — 감실 기하가 전부 이 둘에서 나온다
    apoAt:      (y) => rBot * cosH + (y - (ROOM_FLOOR_Y + ROOM_FLOOR_LIFT - PIT_DEPTH)) * ((rTop - rBot) * cosH / PIT_DEPTH),
    hwAt:       (y) => (rBot * cosH + (y - (ROOM_FLOOR_Y + ROOM_FLOOR_LIFT - PIT_DEPTH)) * ((rTop - rBot) * cosH / PIT_DEPTH)) * Math.tan(Math.PI / N),
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

// ── ★102 감실 스펙 — 여덟 면에 파이는 직사각 개구(입구 평면 = 면 평면 안) ──
//   좌표계: 면마다 (반경 r, 접선 오프셋 u, 높이 y). 면 위의 점 = 축에서 r만큼 나가 u만큼 옆으로.
//   ★입구가 면 안에 눕는다 = 좌우 변이 면의 최급경사선과 나란하고(수직 평면 u=±W가 낸다),
//    아래위 변이 수평선이다(수평 평면 y=yS·yT가 낸다). 넷 다 면 평면 위에 있으니 직사각형.
export function nicheSpec() {
  const s = pitSpec()
  const dip = s.faceDip * Math.PI / 180
  const yS  = s.yBot + NICHE_SILL                       // 턱(감실 바닥) 높이
  const yT  = yS + (s.yTop - yS) * NICHE_H_F            // 입구 윗변
  const W   = s.hwAt(yS) * NICHE_W_F                    // 입구 반폭 — **턱 높이의 면 폭**이 상한
  const RAD = NICHE_DEPTH / Math.sin(dip)              // 면 수직 깊이 → 반경 방향 오프셋(파생)
  const K   = (s.apoTop - s.apoBot) / s.depth          // 높이 1당 면이 물러나는 반경(0.4617)
  //  ★뒷벽 체제(2026.08.02 현도 지시) — 'vertical'은 **입구 윗변**을 기준으로 삼을 수밖에 없다.
  //   아랫변 기준이면 위로 갈수록 면이 물러나 뒷벽이 면 **안쪽**으로 들어간다(깊이 음수 = 뒤집힘).
  //   그 대가로 아래쪽이 깊어진다 — 턱에서의 수평 깊이가 RAD가 아니라 RAD + K·(입구 높이)가 된다.
  const backAt = NICHE_BACK === 'vertical'
    ? () => s.apoAt(yT) + RAD
    : (y) => s.apoAt(y) + RAD
  //  ⓑ 접근 계단: 각뿔대 바닥에서 턱까지. 면 자신이 내주는 수평 몫은 SILL·(면기울기 여분)뿐이라
  //   나머지는 바닥 쪽으로 튀어나온다 — 그 양이 아래 `into`다(여덟이 바닥을 얼마나 먹는지).
  //  ★경사는 하나다(2026.08.02 현도: "계단의 경사가 바뀌던데 그렇지 않은 게 자연스럽다").
  //   접근 구간과 감실 안 구간이 **같은 `NICHE_STAIR_DEG`**를 쓴다 → 단높이·디딤 폭이 전 구간 동일.
  //   구판은 감실 안 경사가 '남은 깊이에 rise를 억지로 나눈 값'이라 뒷벽 체제에 따라 12°~24°로 흔들렸다.
  const tanS  = Math.tan(NICHE_STAIR_DEG * Math.PI / 180)
  const run   = NICHE_SILL / tanS
  const runIn = NICHE_RISE / tanS                      // ★감실 안에서 계단이 쓰는 수평 거리(나머지는 수평 바닥)
  const rFoot = s.apoAt(yS) - run
  const nApp  = Math.max(1, Math.ceil(NICHE_SILL / NICHE_STEP_R))
  const nIn   = Math.max(1, Math.ceil(NICHE_RISE / NICHE_STEP_R))
  return {
    s, dip, yS, yT, W, RAD, K, backAt, run, runIn, rFoot, nApp, nIn,
    backConst:  NICHE_BACK === 'vertical' ? s.apoAt(yT) + RAD : null,
    depthAtS:   backAt(yS) - s.apoAt(yS),          // 턱에서의 **수평** 깊이
    depthAtT:   backAt(yT) - s.apoAt(yT),          // 윗변에서의 수평 깊이('parallel'이면 같다)
    riseApp:  NICHE_SILL / nApp,                        // 실제 단높이(파생 — STEP_UP 아래여야)
    riseIn:   NICHE_RISE > 0 ? NICHE_RISE / nIn : 0,
    into:     s.apoAt(yS) - s.apoAt(s.yBot) < run ? run - (s.apoAt(yS) - s.apoAt(s.yBot)) : 0,
    openW:    2 * W,
    openH:    yT - yS,                                  // 세계 높이
    openSlant: (yT - yS) / Math.sin(dip),               // 면 위에서 잰 입구 높이
    sideFlesh: s.hwAt(yS) - W,                          // 입구 옆에 남는 면 살(반쪽)
    yTopIn:   yS + NICHE_RISE,                          // ⓑ 감실 안 계단 꼭대기 = **수평 바닥(착지)** 높이
    //  ★착지 = 계단이 끝난 뒤 뒷벽까지 남는 수평 바닥(현도 2026.08.02). 음수면 계단이 감실을 뚫는다.
    landing:  (backAt(yS) - s.apoAt(yS)) - runIn,
    tread:    NICHE_RISE > 0 ? runIn / Math.max(1, Math.ceil(NICHE_RISE / NICHE_STEP_R)) : 0,
    treadApp: run / Math.max(1, Math.ceil(NICHE_SILL / NICHE_STEP_R)),
    // 뒷벽 바깥 모서리가 방 아랫반 셸을 뚫지 않는가 — 뚫으면 밖에서 보인다(치명)
    shellGap: (() => {
      let m = Infinity
      for (let k = 0; k <= 100; k++) {
        const y = yS + (yT - yS) * k / 100
        m = Math.min(m, wallR(y) - Math.hypot(backAt(y), W))
      }
      return m
    })(),
  }
}

//  감실 안 어느 반경에서 발이 닿는 높이 — 'flat'은 턱, 'stair'는 그 단의 윗면.
//  ⚠웨이포인트가 이걸 부른다(불변식 2: y = 밟는 면). 착지 스냅 레이가 나머지 오차를 먹는다.
export function nicheFloorYAt(rr) {
  const q = nicheSpec()
  if (NICHE_FLOOR !== 'stair' || q.riseIn <= 0) return q.yS
  const out = Math.max(0, rr - q.s.apoAt(q.yS))
  const j = Math.min(q.nIn, Math.ceil(out / (q.runIn / q.nIn)))   // 계단 구간을 지나면 j가 nIn에 고정 = 착지
  return q.yS + q.riseIn * j
}

// 면 로컬 (r, u, y) → 월드
const fp = (az, r, u, y) => [r * Math.cos(az) - u * Math.sin(az), y, r * Math.sin(az) + u * Math.cos(az)]

// ── ★103 모서리 슬롯 스펙 — 세로 모서리 하나에 파이는 수직 틈(단일 유도점) ──
//  좌표계 = **모서리 로컬**: r = 모서리 방위로 잰 축거리 · u = 그 방위에 수직인 접선 거리.
//  ★기하가 정한 것 둘(노브 아님):
//   ⓐ **인접 면이 잃는 u 폭은 높이와 무관한 상수** `cut = (W/2)/cos(π/N)`.
//     유도: 면 좌표에서 슬롯 경계는 u_f ∈ [−hw(y), −hw(y)+cut]. hw(y)가 커져도 폭은 그대로다.
//     → 그래서 '평행 슬롯'이 면 위에서도 평행하다(현도 채택안).
//   ⓑ **슬롯의 안쪽 경계는 V자**다. 모서리(u=0)가 가장 바깥(r=R)이고 양옆으로 물러난다:
//     rSurf(u,y) = (apo(y) − |u|·sin(π/N)) / cos(π/N).
//  ⚠감실 침범 판정도 여기서 한다 — `nicheClear` < 0이면 슬롯이 감실 입구를 먹는다.
export function slotSpec() {
  const s = pitSpec()
  const phi = Math.PI / s.N
  const az  = s.edgeAz[((SLOT_EDGE % s.N) + s.N) % s.N]
  const HW  = SLOT_W / 2
  const cut = HW / Math.cos(phi)
  const q   = NICHE_ON ? nicheSpec() : null
  const y0  = q ? q.yS : s.yBot + NICHE_SILL          // 출발 = 턱(현도 08.02: "계단은 턱에서 출발")
  const y1  = s.yTop
  const rSurf = (u, y) => (s.apoAt(y) - Math.abs(u) * Math.sin(phi)) / Math.cos(phi)
  const rEdge = (y) => s.apoAt(y) / Math.cos(phi)     // 모서리 자신의 축거리
  //  감실 여유 = (면 살) − cut. 최소는 **턱 높이**에서 난다(면 살이 위로 갈수록 넓어지므로).
  const nicheClear = q ? (s.hwAt(q.yS) - q.W) - cut : Infinity
  //  판 초과 = 뒷벽이 판 구멍(입술 바깥 팔각)을 얼마나 넘는가. 슬롯 옆끝(|u|=HW)에서 제일 크다.
  const rimAt = (s.rRim * Math.cos(phi) - HW * Math.sin(phi)) / Math.cos(phi)
  //  ★104: 계단이 켜지면 **뒷벽은 계단이 정한다**(참의 바깥 끝 + 인셋). 결합 설계 — 둘이 어긋날 수 없다.
  const back = SLOT_STAIR === 'off' ? SLOT_BACK_R : stairSolve(y0, y1, rEdge).back
  return {
    s, q, phi, az, HW, cut, y0, y1, rSurf, rEdge, nicheClear,
    back,
    faceHi:    ((SLOT_EDGE % s.N) + s.N) % s.N,               // 이 면에서 슬롯은 **−u** 쪽
    faceLo:    ((SLOT_EDGE - 1) % s.N + s.N) % s.N,           // 이 면에서 슬롯은 **+u** 쪽
    depthAt:   (y) => back - rEdge(y),                        // 모서리선에서 잰 깊이
    depthSill: back - rEdge(y0),
    depthTop:  back - rEdge(y1),
    rise:      y1 - y0,
    runStraight: back - rEdge(y0),                            // 슬롯 안 직선 주행(반경 방향)
    straightDeg: Math.atan2(y1 - y0, back - rEdge(y0)) * 180 / Math.PI,
    slabBite:  Math.max(0, back - rimAt),                     // 판을 얼마나 파야 하는가(0이면 무수술)
    spiralIn:  _RSR - _RSW / 2,                               // ⛔뒷벽 천장 = 공리 나선 최하 디딤판 안끝
    //  이 방위각에서 슬롯이 판 구멍을 얼마나 밀어내는가 — buildHoledSlab이 부른다.
    //  슬롯 = |r·sin δ| ≤ HW  그리고  r·cos δ ≤ back. 둘의 min이 슬롯 바깥 경계다.
    holeRAt: (theta) => {
      let d = (theta - az) % (2 * Math.PI)
      if (d > Math.PI) d -= 2 * Math.PI
      if (d < -Math.PI) d += 2 * Math.PI
      const c = Math.cos(d), sn = Math.abs(Math.sin(d))
      if (c <= 0) return 0
      return Math.min(back / c, sn < 1e-9 ? Infinity : HW / sn)
    },
    //  판·기단 스윕에 끼워 넣어야 할 방위각(노치 경계 — 등분 격자만으로는 5°짜리 노치를 놓친다)
    extraTh: (() => {
      const out = []
      const dEnd = Math.asin(Math.min(1, HW / (s.rRim * 0.999)))   // 노치가 구멍 팔각과 만나는 각
      for (let k = -40; k <= 40; k++) out.push(az + dEnd * 1.35 * (k / 40))
      return out
    })(),
  }
}

//  법선 방향을 지정해 **삼각형** 하나를 놓는다. ⚠사각형 헬퍼에 네 번째 점을 첫 점과 같게 넘기면
//   퇴화 삼각형이 생기고 그 감김 판정이 0벡터가 된다(2026.08.02 실측: 퇴화 416·불일치 208).
function triTo(P, Nn, a, b, c, want) {
  const n = faceN(a, b, c)
  if (!Number.isFinite(n[0]) || Math.hypot(n[0], n[1], n[2]) < 0.5) return   // 퇴화 = 버린다
  const fwd = n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0
  const [x, y, z] = fwd ? [a, b, c] : [a, c, b]
  const m = faceN(x, y, z)
  for (const v of [x, y, z]) P.push(v[0], v[1], v[2])
  for (let i = 0; i < 3; i++) Nn.push(m[0], m[1], m[2])
}
//  법선 방향을 지정해 사각형을 놓는다 — 감김을 손으로 세지 않고 원하는 쪽으로 뒤집는다.
function quadTo(P, Nn, a, b, c, d, want) {
  let n = faceN(a, b, c)
  if (n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) { quad(P, Nn, a, d, c, b, faceN(a, d, c)); return }
  quad(P, Nn, a, b, c, d, n)
}
//  (r,y) **볼록 다각형**을 접선 방향 u0~u1로 밀어 만든 기둥 하나(계단 한 단 = 이것 하나).
//  ★2026.08.02 일반화: 구판은 사각형 고정이었고, 안쪽 변이 벽면보다 바깥으로 나가면 **나비넥타이**가
//   돼 옆면 감김이 뒤집혔다(현도 신고 "계단 앞면이 안 보인다" — 8면×2단×2장 = 32삼각 컬링).
//   이제 호출자가 벽면과의 교차점을 넣어 3~5각형을 주고, 여기서 **부채 삼각분할**한다.
function prism(P, Nn, az, poly, u0, u1) {
  const pts = []
  for (const q of poly) {                                  // 인접 중복점 제거(교차점이 꼭짓점과 겹칠 때)
    const last = pts[pts.length - 1]
    if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) > 1e-9) pts.push(q)
  }
  if (pts.length > 1) {
    const f = pts[0], l = pts[pts.length - 1]
    if (Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-9) pts.pop()
  }
  if (pts.length < 3) return
  let A2 = 0                                               // 부호 있는 넓이 — 링 방향 판정
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    A2 += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]
  }
  if (Math.abs(A2) < 1e-9) return
  const ring = A2 > 0 ? pts : pts.slice().reverse()         // (r,y) 평면에서 항상 CCW로 통일
  const p = (ru, u) => fp(az, ru[0], u, ru[1])
  const t = [-Math.sin(az), 0, Math.cos(az)]
  const cen = ring.reduce((a, q) => [a[0] + q[0] / ring.length, a[1] + q[1] / ring.length], [0, 0])
  for (let i = 1; i + 1 < ring.length; i++) {               // 두 캡 — 부채 삼각분할(볼록 전제)
    triTo(P, Nn, p(ring[0], u0), p(ring[i], u0), p(ring[i + 1], u0), [-t[0], 0, -t[2]])
    triTo(P, Nn, p(ring[0], u1), p(ring[i], u1), p(ring[i + 1], u1), t)
  }
  for (let i = 0; i < ring.length; i++) {                   // 옆면 — 링 방향이 통일돼 있어 감김이 안 꼬인다
    const j = (i + 1) % ring.length
    const mid = [(ring[i][0] + ring[j][0]) / 2, (ring[i][1] + ring[j][1]) / 2]
    const w = [Math.cos(az) * (mid[0] - cen[0]), mid[1] - cen[1], Math.sin(az) * (mid[0] - cen[0])]
    const wl = Math.hypot(w[0], w[1], w[2]) || 1
    quadTo(P, Nn, p(ring[i], u0), p(ring[j], u0), p(ring[j], u1), p(ring[i], u1),
      [w[0] / wl, w[1] / wl, w[2] / wl])
  }
}

// ── ① 각뿔대 옆벽(경사면) — **밟는 면이 아니다**(65.2° 빗면). 두께 PIT_WALL_T로 §2-D 2 '종잇장 금지'.
//   ⚠입술 띠는 여기 없다 — 그건 수평이고 실제로 밟으므로 **다른 메시**(buildPitRim)로 뗀다.
//   ★102: 감실이 켜지면 안·바깥 면에 **직사각 구멍**이 뚫린다. 구멍 둘레를 네 띠로 갈라 그린다
//    (아래·위 사다리꼴 + 좌·우 사다리꼴) — 구멍의 좌우 변이 최급경사선과 나란해서 이 분해가 정확하다.
export function buildPitWalls() {
  const s = pitSpec(), N = s.N, P = [], Nn = []
  const nq = NICHE_ON ? nicheSpec() : null
  const sq = SLOT_ON ? slotSpec() : null
  const tanH = Math.tan(Math.PI / N)
  const hwI = (y) => s.apoAt(y) * tanH
  const hwO = (y) => (s.apoAt(y) + PIT_WALL_T) * tanH
  for (let i = 0; i < N; i++) {
    const az = s.faceAz[i]
    //  ★103: 슬롯이 걸친 두 면은 슬롯 쪽 가장자리가 **상수 cut만큼** 안으로 물러난다(y0 위 구간에서만).
    const slotSide = !sq ? 0 : (i === sq.faceHi ? -1 : (i === sq.faceLo ? +1 : 0))
    //  ⚠띠 단위로 켠다 — 턱(y0) 아래 띠는 무손상이고 위 띠만 물러난다. 높이로 판정하면
    //   경계 y0에서 아래 띠의 윗변까지 깎여 벽이 잘못 좁아진다(경계 공유 함정).
    const edgeL = (hw, on) => (y) => (on && slotSide === -1) ? -hw(y) + sq.cut : -hw(y)
    const edgeR = (hw, on) => (y) => (on && slotSide === +1) ? hw(y) - sq.cut : hw(y)
    const inward = [-Math.sin(s.faceDip * Math.PI / 180) * Math.cos(az),
      Math.cos(s.faceDip * Math.PI / 180),
      -Math.sin(s.faceDip * Math.PI / 180) * Math.sin(az)]
    const outward = [-inward[0], -inward[1], -inward[2]]
    const band = (rOf, hw, y0, y1, uL, uR, want, cutOn = false) => {   // uL/uR = null이면 면 가장자리
      const eL = edgeL(hw, cutOn), eR = edgeR(hw, cutOn)
      const l0 = uL === null ? eL(y0) : uL, l1 = uL === null ? eL(y1) : uL
      const r0 = uR === null ? eR(y0) : uR, r1 = uR === null ? eR(y1) : uR
      if (Math.abs(r0 - l0) < 1e-9 && Math.abs(r1 - l1) < 1e-9) return
      quadTo(P, Nn, fp(az, rOf(y0), l0, y0), fp(az, rOf(y0), r0, y0),
        fp(az, rOf(y1), r1, y1), fp(az, rOf(y1), l1, y1), want)
    }
    for (const [rOf, hw, want] of [
      [(y) => s.apoAt(y), hwI, inward],
      [(y) => s.apoAt(y) + PIT_WALL_T, hwO, outward]]) {
      if (!nq) {
        if (sq && slotSide) {
          band(rOf, hw, s.yBot, sq.y0, null, null, want, false)
          band(rOf, hw, sq.y0, s.yTop, null, null, want, true)
        } else band(rOf, hw, s.yBot, s.yTop, null, null, want, false)
        continue
      }
      band(rOf, hw, s.yBot, nq.yS, null, null, want, false)   // 아래 사다리꼴(슬롯은 턱에서 시작 = 무손상)
      band(rOf, hw, nq.yT, s.yTop, null, null, want, true)    // 위 사다리꼴(갓)
      band(rOf, hw, nq.yS, nq.yT, null, -nq.W, want, true)    // 왼쪽 살
      band(rOf, hw, nq.yS, nq.yT, nq.W, null, want, true)     // 오른쪽 살
    }
    // 밑띠(아래, 수평) — 안팎을 잇는다
    const p = (r, u, y) => fp(az, r, u, y)
    quadTo(P, Nn, p(s.apoAt(s.yBot), -hwI(s.yBot), s.yBot), p(s.apoAt(s.yBot), hwI(s.yBot), s.yBot),
      p(s.apoAt(s.yBot) + PIT_WALL_T, hwO(s.yBot), s.yBot), p(s.apoAt(s.yBot) + PIT_WALL_T, -hwO(s.yBot), s.yBot),
      [0, -1, 0])
  }
  return finish(P, Nn)
}

// ── ★104 슬롯 계단 — **닫힌 식**으로 갈래를 나눈다(격자 탐색 금지: 값이 세션마다 흔들린다) ──
//  기호: k = 1/tanθ(상승 1당 주행) · m = 벽면 기울기 dr/dy = 0.5 · H = 오를 높이 · L = 참 깊이 · IN = 인셋.
//  ★차선제: 갈래 i는 차선 i%2에 앉는다. 같은 차선이 겹치는 것은 A에선 없고, B에선 갈래 0↔2뿐이다.
//  ★★참은 **지나가는 길이 아니라 온전한 수평판**이다(현도 08.02 정정). 구판은 참 끝에서 다음 갈래가
//   출발해 되돌아오는 갈래가 **참 위를 덮었고**, 그래서 참을 늘려도 밟을 수 있는 판은 안 늘었다.
//   정본: 갈래가 끝난 자리(=돌아서는 점)에서 다음 갈래가 **그대로 출발**하고, 참은 그 점에서
//   진행 방향으로 L만큼 **뻗어 나간 판**이다. 그 판 위에는 다음 갈래가 올라타지 않는다.
//   ⚠대가: L이 더 이상 주행 예산을 도와주지 않는다 — 뒷벽이 L만큼(A) 또는 1.25L만큼(B) 곧장 나간다.
//  【A · 2갈래】밖(h1) → 참 → 안(h2). 도착이 판 높이의 벽면 밖: k(h1−h2) ≥ mH − IN (L 무관).
//    → h1 = H/2 + (mH − IN)/(2k) · 뒷벽 = r0 + k·h1 + L + IN.
//  【B · 3갈래】밖(h1) → 참 → 안(h2) → 참 → 밖(h3). 구속 둘을 동시에 조인다:
//    ⓐ **안쪽 참의 안쪽 끝**이 벽면 밖: k(h1−h2) ≥ m(h1+h2) + L − IN
//    ⓑ 마지막 갈래 끝이 바깥 참 끝을 안 넘음: k(h3−h2) ≤ L
//    등호 둘을 연립 → h2 = [(m−k)H − mL/k + 2L − IN] / (m − 3k), h3 = h2 + L/k, h1 = H − h2 − h3.
//  ⛔**나선 천장 자동 클램프:** 뒷벽이 공리 나선 발치를 넘으면 L을 줄인다(체제 A는 2.9를 못 받는다).
//   조용히 깎지 않는다 — `Lclamped`로 내보내고 검사가 매 실행 보고한다.
export function stairSolve(y0, y1, rEdge) {
  const s = pitSpec()
  const deg = SLOT_STAIR === 'A' ? 35 : 33
  const k = 1 / Math.tan(deg * Math.PI / 180)
  const m = (s.rTop - s.rBot) / s.depth
  const H = y1 - y0, IN = SLOT_STAIR_INSET
  const rStart = rEdge(y0) + IN
  const split = (L) => SLOT_STAIR === 'A'
    ? (() => { const h1 = H / 2 + (m * H - IN) / (2 * k); return [h1, H - h1] })()
    : (() => {
        const h2 = ((m - k) * H - m * L / k + 2 * L - IN) / (m - 3 * k)
        const h3 = h2 + L / k
        return [H - h2 - h3, h2, h3]
      })()
  const backOf = (LL) => rStart + k * split(LL)[0] + LL + IN
  //  ⛔나선 천장 클램프 — L을 키우면 뒷벽이 단조 증가한다(A +1.00/L · B +1.25/L, 실측).
  const CEIL = _RSR - _RSW / 2 - SLOT_SPIRAL_PAD
  let L = SLOT_LANDING, Lclamped = false
  if (backOf(L) > CEIL) {
    let lo = 0, hi = L
    for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (backOf(mid) <= CEIL) lo = mid; else hi = mid }
    L = lo; Lclamped = true
  }
  const hs = split(L)
  //  ★단 쌓는 순서(§constants ⓓ): 밖으로 = 디딤 먼저, 안으로 = 리저 먼저.
  //   반대로 하면 리저 꼭대기에서 r이 안 움직인 채 벽면만 올라와 벽 속으로 들어간다.
  const runs = []          // {kind:'tread'|'landing', r0, r1, y, flight, lane}
  let r = rEdge(y0) + IN, y = y0, dir = 1
  hs.forEach((h, i) => {
    const nSt = Math.max(1, Math.ceil(h / SLOT_STEP_R))
    const rise = h / nSt, tread = rise * k
    for (let j = 0; j < nSt; j++) {
      if (dir > 0) { runs.push({ kind: 'tread', r0: r, r1: r + tread, y, flight: i, lane: i % 2 }); r += tread; y += rise }
      else { y += rise; runs.push({ kind: 'tread', r0: r - tread, r1: r, y, flight: i, lane: i % 2 }); r -= tread }
    }
    //  ⚠구판은 여기서 마지막 디딤의 y를 참 높이로 끌어올렸다(참과 면을 맞추려고). 그러면 그 한 단만
    //   **2배(0.99)로 튀어** 올라갈 수 없다(현도 로컬 신고 → 실측 확인). 밖으로 가는 갈래의 마지막 디딤은
    //   참보다 **한 단 아래**가 정상이다 — 거기서 참으로 한 단 올라선다.
    if (i < hs.length - 1) {
      //  ★참 = 돌아서는 점에서 진행 방향으로 뻗은 **온전한 수평판**. r은 **안 움직인다** —
      //   다음 갈래가 돌아서는 점에서 그대로 출발하므로 이 판 위를 덮지 않는다.
      runs.push({ kind: 'landing', r0: Math.min(r, r + dir * L), r1: Math.max(r, r + dir * L), y, flight: i, lane: -1 })
      dir = -dir
    }
  })
  const back = Math.max(...runs.map(q => q.r1)) + IN
  return { deg, k, m, L, Lwant: SLOT_LANDING, Lclamped, hs, runs, back, rise: H,
    stepRise: hs.map((h) => h / Math.max(1, Math.ceil(h / SLOT_STEP_R))),
    endR: runs[runs.length - 1][dir > 0 ? 'r1' : 'r0'], endY: y, lanes: hs.map((_, i) => i % 2) }
}

// ── ★104-a 계단 기하 — 차선 둘. 아래에 아무것도 없는 갈래는 **속 찬 매스**, 되돌아온 갈래는 **매달린 슬래브** ──
export function buildSlotStairs() {
  const P = [], Nn = []
  if (!SLOT_ON || SLOT_STAIR === 'off') return finish(P, Nn)
  const g = slotSpec(), t = stairSolve(g.y0, g.y1, g.rEdge)
  const az = g.az, IN = SLOT_STAIR_INSET, GA = SLOT_LANE_GAP / 2
  const uOut = g.HW - IN
  const laneU = (lane) => lane === 0 ? [-uOut, -GA] : (lane === 1 ? [GA, uOut] : [-uOut, uOut])
  const box = (r0, r1, u0, u1, ya, yb) => {
    if (r1 - r0 < 1e-9 || yb - ya < 1e-9) return
    const p = (r, u, y) => fp(az, r, u, y)
    const eT = [-Math.sin(az), 0, Math.cos(az)], eR = [Math.cos(az), 0, Math.sin(az)]
    quadTo(P, Nn, p(r0, u0, yb), p(r1, u0, yb), p(r1, u1, yb), p(r0, u1, yb), [0, 1, 0])
    quadTo(P, Nn, p(r0, u0, ya), p(r1, u0, ya), p(r1, u1, ya), p(r0, u1, ya), [0, -1, 0])
    quadTo(P, Nn, p(r0, u0, ya), p(r0, u0, yb), p(r0, u1, yb), p(r0, u1, ya), [-eR[0], 0, -eR[2]])
    quadTo(P, Nn, p(r1, u0, ya), p(r1, u0, yb), p(r1, u1, yb), p(r1, u1, ya), eR)
    for (const [u, sg] of [[u0, -1], [u1, 1]])
      quadTo(P, Nn, p(r0, u, ya), p(r1, u, ya), p(r1, u, yb), p(r0, u, yb), [sg * eT[0], 0, sg * eT[2]])
  }
  //  갈래 0·1과 첫 참은 밑이 비어 있으므로 **바닥까지 채운다**(§2-D 2). 갈래 2와 둘째 참은
  //  갈래 0 위로 되돌아오므로 **슬래브**여야 한다 — 매스로 하면 아래 갈래의 머리 위를 통째로 메운다.
  for (const q of t.runs) {
    const [u0, u1] = laneU(q.lane)
    const solid = q.flight <= 1 && !(q.kind === 'landing' && q.flight === 1)
    if (solid) box(q.r0, q.r1, u0, u1, g.y0, q.y)
    else box(q.r0, q.r1, u0, u1, q.y - SLOT_SLAB_T, q.y)
  }
  return finish(P, Nn)
}

// ── ①-b 입술 띠(rTop~rRim, 수평, 판과 같은 높이) = 구멍의 두꺼운 테두리. **밟는 면.** ──
//   판 고리(rRim~ROOM_R)와 정확히 이어 붙는다 — 겹침 0·틈 0(둘 다 rRim에서 만난다).
//   ★103: 슬롯이 걸친 두 면은 이 띠도 **같은 상수 cut만큼** 물러난다(안·바깥 변 모두).
//    ⚠전제 = `SLOT_BACK_R ≥ rRim` — 뒷벽이 입술 바깥보다 안쪽이면 띠가 통째로 안 뚫려 슬롯이 덮인다.
//    검사가 이 전제를 잰다.
export function buildPitRim() {
  const s = pitSpec(), N = s.N, P = [], Nn = []
  const sq = SLOT_ON ? slotSpec() : null
  const tanH = Math.tan(Math.PI / N), cosH = Math.cos(Math.PI / N)
  const apoIn = s.rTop * cosH, apoOut = s.rRim * cosH
  for (let i = 0; i < N; i++) {
    const az = s.faceAz[i]
    const side = !sq ? 0 : (i === sq.faceHi ? -1 : (i === sq.faceLo ? +1 : 0))
    const lo = (apo) => (side === -1 ? -apo * tanH + sq.cut : -apo * tanH)
    const hi = (apo) => (side === +1 ? apo * tanH - sq.cut : apo * tanH)
    quadTo(P, Nn,
      fp(az, apoIn, lo(apoIn), s.yTop), fp(az, apoIn, hi(apoIn), s.yTop),
      fp(az, apoOut, hi(apoOut), s.yTop), fp(az, apoOut, lo(apoOut), s.yTop), [0, 1, 0])
  }
  return finish(P, Nn)
}

// ── ★103-a 슬롯 속 = 바닥(밟는 면) + 옆벽 둘 + 뒷벽. 천장은 없다(판으로 열린다) ──
//   `walk`=true면 바닥만, false면 나머지만 — 감실과 같은 분리 규약(태그가 빗면까지 밟게 하면 안 된다).
//   ★바닥이 **오각형**인 이유: 안쪽 경계가 모서리에서 가장 바깥으로 튀어나온 V자이기 때문이다
//    (모서리 = 팔각형의 최원점). 사각형으로 잡으면 모서리 살을 먹어 벽에 구멍이 난다.
export function buildPitSlot(walk) {
  const P = [], Nn = []
  if (!SLOT_ON) return finish(P, Nn)
  const g = slotSpec()
  const az = g.az, HW = g.HW, B = g.back
  const p = (r, u, y) => fp(az, r, u, y)
  const eT = [-Math.sin(az), 0, Math.cos(az)]
  const eR = [Math.cos(az), 0, Math.sin(az)]
  if (walk) {
    const A = p(g.rSurf(-HW, g.y0), -HW, g.y0)
    const Bp = p(g.rEdge(g.y0), 0, g.y0)
    const C = p(g.rSurf(HW, g.y0), HW, g.y0)
    const D = p(B, HW, g.y0)
    const E = p(B, -HW, g.y0)
    triTo(P, Nn, A, Bp, C, [0, 1, 0])
    triTo(P, Nn, A, C, D, [0, 1, 0])
    triTo(P, Nn, A, D, E, [0, 1, 0])
    return finish(P, Nn)
  }
  for (const sgn of [-1, 1]) {            // 옆벽 둘 — 수직 평면 u = ±HW
    quadTo(P, Nn,
      p(g.rSurf(sgn * HW, g.y0), sgn * HW, g.y0), p(B, sgn * HW, g.y0),
      p(B, sgn * HW, g.y1), p(g.rSurf(sgn * HW, g.y1), sgn * HW, g.y1),
      [-sgn * eT[0], 0, -sgn * eT[2]])
  }
  quadTo(P, Nn, p(B, -HW, g.y0), p(B, HW, g.y0), p(B, HW, g.y1), p(B, -HW, g.y1),
    [-eR[0], 0, -eR[2]])                  // 뒷벽
  return finish(P, Nn)
}

// ── ★102-a 감실 속 = 바닥·천장·옆벽 둘·뒷벽. 뒷벽은 **면과 나란하다**(깊이가 전 구간 일정) ──
//   `walk`=true면 밟는 면(바닥)만, false면 나머지만 담는다 — 한 메시에 몰면 태그가 빗면까지 밟게 한다.
export function buildNiches(walk) {
  const P = [], Nn = []
  if (!NICHE_ON) return finish(P, Nn)
  const q = nicheSpec(), s = q.s
  for (let i = 0; i < s.N; i++) {
    const az = s.faceAz[i]
    const p = (r, u, y) => fp(az, r, u, y)
    const aS = s.apoAt(q.yS), aT = s.apoAt(q.yT)
    const bS = q.backAt(q.yS), bT = q.backAt(q.yT)      // 뒷벽 — 'parallel'이면 면과 나란, 'vertical'이면 bS=bT
    if (walk) {   // 바닥(수평) — ⓑ에서는 이 위에 계단이 얹힌다
      quadTo(P, Nn, p(aS, -q.W, q.yS), p(aS, q.W, q.yS), p(bS, q.W, q.yS), p(bS, -q.W, q.yS), [0, 1, 0])
      continue
    }
    quadTo(P, Nn, p(aT, -q.W, q.yT), p(aT, q.W, q.yT), p(bT, q.W, q.yT), p(bT, -q.W, q.yT), [0, -1, 0])  // 천장
    const t = [-Math.sin(az), 0, Math.cos(az)]
    for (const sgn of [-1, 1]) {   // 옆벽 둘(수직 평면 u=±W)
      quadTo(P, Nn, p(aS, sgn * q.W, q.yS), p(bS, sgn * q.W, q.yS),
        p(bT, sgn * q.W, q.yT), p(aT, sgn * q.W, q.yT), [-sgn * t[0], 0, -sgn * t[2]])
    }
    quadTo(P, Nn, p(bS, -q.W, q.yS), p(bS, q.W, q.yS),   // 뒷벽
      p(bT, q.W, q.yT), p(bT, -q.W, q.yT),
      [-Math.cos(az), 0, -Math.sin(az)])
  }
  return finish(P, Nn)
}

// ── ★102-b ⓑ 계단 = 각뿔대 바닥에서 출발해 턱을 오르고 **감실 안까지 이어진다**(현도 정정) ──
//   어휘 = §2-D 2 '속 찬 매스': 단마다 **자기 뒤쪽 끝까지 닿는 판**을 겹쳐 쌓는다(낱장 디딤판 아님).
//   ★쌓는 방향이 정본이다(2026.08.02 정정): 높은 단일수록 **안쪽 변이 바깥으로** 가고 뒤쪽 끝까지 닿아야
//    낮은 단의 디딤이 드러난다. 구판은 감실 안 계단이 전부 벽면에서 출발해 **꼭대기 단이 나머지를 덮었다**
//    (현도 신고 "감실 안까지 연결되지 않는다" — 계단이 아니라 단상 하나로 보였다).
//   ★벽면 교차 처리: 벽이 65.2°로 누워 있어 높은 단의 안쪽 변은 낮은 높이에서 **벽 속**이다.
//    그 높이(yCross)에서 프로파일을 꺾어 벽면을 타게 한다 — 이걸 안 하면 사각형이 꼬인다.
export function buildNicheStairs() {
  const P = [], Nn = []
  if (!NICHE_ON || NICHE_FLOOR !== 'stair') return finish(P, Nn)
  const q = nicheSpec(), s = q.s
  const A = (y) => s.apoAt(y)
  for (let i = 0; i < s.N; i++) {
    const az = s.faceAz[i]
    // ① 접근 계단: 각뿔대 바닥 → 턱. 바깥 변 = **벽면 자신**.
    for (let k = 1; k <= q.nApp; k++) {
      const yk  = s.yBot + q.riseApp * k
      const rIn = q.rFoot + q.run * (k - 1) / q.nApp
      const yX  = s.yBot + Math.max(0, (rIn - A(s.yBot)) / q.K)      // 벽면이 rIn에 닿는 높이
      const poly = yX <= s.yBot + 1e-9
        ? [[rIn, s.yBot], [A(s.yBot), s.yBot], [A(yk), yk], [rIn, yk]]
        : [[rIn, yX], [A(yk), yk], [rIn, yk]]                        // 그 아래는 벽 속 = 삼각형
      //  ★105 전폭화: u 범위를 **그 단 바깥변(벽면)의 면 반폭**까지. 인접 면의 같은 단과 모서리에서
      //   정확히 만나 쐐기 틈이 닫히고, 꼭대기 단이 슬롯 바닥과 같은 높이로 이어진다.
      //   ⚠안쪽 변에서는 이 폭이 팔각을 살짝 넘는데, 넘어간 몫은 이웃 계단 속이라 합집합으로 묻힌다.
      const hwK = NICHE_APP_WIDE ? A(yk) * Math.tan(Math.PI / s.N) : q.W
      if (yX < yk - 1e-9) prism(P, Nn, az, poly, -hwK, hwK)
    }
    if (q.riseIn <= 0) continue
    // ② 감실 안 계단: 턱 → 안쪽 꼭대기. 바깥 변 = **뒷벽**(체제 따라 나란/수직).
    //    ★디딤 폭은 접근 구간과 **같은 경사**에서 나온다(`runIn`) — 남은 깊이는 마지막 단이 그대로
    //     뒷벽까지 밀고 나가 **수평 바닥(착지)**이 된다(현도 2026.08.02).
    for (let j = 1; j <= q.nIn; j++) {
      const yj  = q.yS + q.riseIn * j
      const rIn = A(q.yS) + q.runIn * (j - 1) / q.nIn                // 이 단의 챌판(수직) 위치
      const yX  = q.yS + Math.max(0, (rIn - A(q.yS)) / q.K)          // 벽면이 rIn을 넘어서는 높이
      const poly = []
      poly.push([rIn, q.yS], [q.backAt(q.yS), q.yS], [q.backAt(yj), yj])
      poly.push([Math.max(rIn, A(yj)), yj])
      if (yX > q.yS + 1e-9 && yX < yj - 1e-9) poly.push([rIn, yX])   // 벽면과 만나는 꺾임
      prism(P, Nn, az, poly, -q.W, q.W)
    }
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
//   ★103: `opts.holeRAt(theta)`가 있으면 구멍 반경을 그만큼 **밀어낸다**(모서리 슬롯 노치).
//    노치는 5°쯤밖에 안 되므로 등분 격자만으로는 통째로 놓친다 → `opts.extraTh`로 방위각을 끼워 넣는다.
//    ⚠뒤집힌 고리 가드: 밀린 구멍이 바깥 반경을 넘으면 안반경 > 바깥반경이라 면이 뒤집힌다(★102 전례).
//    그 구간은 **안 그린다**.
export function buildHoledSlab(rOut, outSegs, rHole, holeSides, holePhase, thickness = 0, opts = {}) {
  const P = [], Nn = []
  const th = [], out = [], inn = [], ok = []
  const base = Array.from({ length: outSegs + 1 }, (_, k) => k * 2 * Math.PI / outSegs)
  const extra = (opts.extraTh || []).map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
  const all = [...base, ...extra].sort((a, b) => a - b).filter((a, i, arr) => i === 0 || a - arr[i - 1] > 1e-7)
  for (const a of all) {
    th.push(a)
    out.push([rOut * Math.cos(a), 0, rOut * Math.sin(a)])
    let rp = polyRadiusAt(a, rHole, holeSides, holePhase)
    if (opts.holeRAt) rp = Math.max(rp, opts.holeRAt(a))
    ok.push(rp < rOut - 1e-6)
    inn.push([rp * Math.cos(a), 0, rp * Math.sin(a)])
  }
  const drop = (v) => [v[0], -thickness, v[2]]
  for (let k = 0; k < th.length - 1; k++) {
    if (!ok[k] || !ok[k + 1]) continue
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


// ══════════════════════════════════════════════════════════════
//  ★117 감실 처마 여덟 (2026.08.05 현도 지시)
//   입술에 앉아 아가리 위로 내밀며 **위로 솟는** 평면 패널 여덟. 뿌리 두껍고 끝 얇다.
//   ★뿌리 팔각과 끝 팔각이 **닮음**이라 이웃 패널이 공유 모서리에서 정확히 만난다
//    → 마이터가 저절로 되고 틈이 없다. 부드럽게가 아니라 각지게(현도).
//   ⚠0° 모서리 = ★103 슬롯 → 고리를 끊는다(현도 ⓐ). 그 두 끝에만 마구리가 생긴다.
// ══════════════════════════════════════════════════════════════
export function eaveSpec() {
  const P = pitSpec(), S = slotSpec()
  const th = EAVE_TILT * Math.PI / 180
  const inHoriz = EAVE_LEN * Math.cos(th)          // 안으로
  const up      = EAVE_LEN * Math.sin(th)          // 위로
  const apoTip  = P.apoTop - inHoriz
  const rTip    = apoTip / Math.cos(Math.PI / P.N) // 끝 팔각 외접
  //  슬롯이 잡아먹는 접선폭 → 그 모서리 양옆에서 물러나는 비율(뿌리 변 길이 기준)
  const pull    = (S.HW + EAVE_SLOT_CLR) / P.sideTop
  return {
    N: P.N, yRoot: P.yTop, yTip: P.yTop + up,
    rRoot: P.rTop, rTip, apoRoot: P.apoTop, apoTip,
    inHoriz, up, t0: EAVE_T0, t1: EAVE_T1, tiltDeg: EAVE_TILT,
    slotAz: S.az, slotHW: S.HW, pull,
    //  슬롯 모서리의 꼭짓점 번호(위상 0 = 꼭짓점이 0°이므로 0번)
    slotVertex: Math.round(((S.az - PIT_PHASE) / (2 * Math.PI / P.N))) % P.N,
  }
}

export function buildPitEaves() {
  const g = new THREE.BufferGeometry()
  const P3 = [], N3 = []
  if (!EAVE_ON) {
    g.setAttribute('position', new THREE.Float32BufferAttribute([], 3))
    g.setAttribute('normal',   new THREE.Float32BufferAttribute([], 3))
    return g
  }
  const s = eaveSpec(), P = pitSpec()
  const th = s.tiltDeg * Math.PI / 180
  const vert = (r, i) => {                          // 팔각 꼭짓점 i (반경 r)
    const a = PIT_PHASE + i * (2 * Math.PI / s.N)
    return [r * Math.cos(a), r * Math.sin(a)]
  }
  const tri = (A, B, C, ref) => {
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2]
    const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2]
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const L = Math.hypot(nx, ny, nz)
    if (!(L > 1e-12)) return
    nx /= L; ny /= L; nz /= L
    const cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3, cz = (A[2] + B[2] + C[2]) / 3
    let a = A, b = B, c = C
    if (nx * (cx - ref[0]) + ny * (cy - ref[1]) + nz * (cz - ref[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; b = C; c = B }
    for (const p of [a, b, c]) { P3.push(p[0], p[1], p[2]); N3.push(nx, ny, nz) }
  }
  const quad = (A, B, C, D, ref) => { tri(A, B, C, ref); tri(A, C, D, ref) }

  for (let f = 0; f < s.N; f++) {
    //  이 면의 t 범위 — 슬롯 꼭짓점에 닿는 두 면만 물러난다(고리를 끊는다)
    let t0 = 0, t1 = 1
    if (f === s.slotVertex) t0 = s.pull                    // 면 f는 꼭짓점 f에서 시작
    if ((f + 1) % s.N === s.slotVertex) t1 = 1 - s.pull    // 면 f는 꼭짓점 f+1에서 끝
    const A0 = vert(s.rRoot, f), A1 = vert(s.rRoot, (f + 1) % s.N)
    const B0 = vert(s.rTip,  f), B1 = vert(s.rTip,  (f + 1) % s.N)
    const lerp = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]
    //  면 안쪽 법선(수평) — 두께를 이 방향과 아래로 섞어 잰다
    const faceAz = PIT_PHASE + (f + 0.5) * (2 * Math.PI / s.N)
    const inw = [-Math.cos(faceAz), -Math.sin(faceAz)]
    //  경사면에 수직인 '아래' 방향 = (안쪽 sinθ, 위 −cosθ)
    const dn = (t) => [inw[0] * Math.sin(th) * t, -Math.cos(th) * t, inw[1] * Math.sin(th) * t]
    const pRootTop = (t) => { const q = lerp(A0, A1, t); return [q[0], s.yRoot, q[1]] }
    const pTipTop  = (t) => { const q = lerp(B0, B1, t); return [q[0], s.yTip,  q[1]] }
    const add = (p, d) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]]
    const RT0 = pRootTop(t0), RT1 = pRootTop(t1), TT0 = pTipTop(t0), TT1 = pTipTop(t1)
    const RB0 = add(RT0, dn(s.t0)), RB1 = add(RT1, dn(s.t0))
    const TB0 = add(TT0, dn(s.t1)), TB1 = add(TT1, dn(s.t1))
    const ref = [(RT0[0] + RT1[0] + TT0[0] + TT1[0] + RB0[0] + RB1[0] + TB0[0] + TB1[0]) / 8,
                 (RT0[1] + RT1[1] + TT0[1] + TT1[1] + RB0[1] + RB1[1] + TB0[1] + TB1[1]) / 8,
                 (RT0[2] + RT1[2] + TT0[2] + TT1[2] + RB0[2] + RB1[2] + TB0[2] + TB1[2]) / 8]
    quad(RT0, RT1, TT1, TT0, ref)      // ★윗면(위를 향한다 — 밝게 뜬다)
    quad(TB0, TB1, RB1, RB0, ref)      // 밑면
    quad(TT0, TT1, TB1, TB0, ref)      // 끝 마구리(얇은 쪽 — 립 t1 유지)
    quad(RB0, RB1, RT1, RT0, ref)      // 뿌리 마구리(입술에 묻힌다)
    //  ⚠옆 마구리는 **끊긴 자리에만** 낸다 — 이어지는 모서리는 이웃 패널이 정확히 만나므로
    //   면을 내면 동일 평면 두 장이 겹쳐 z-파이팅이 난다.
    if (t0 > 0) quad(RT0, TT0, TB0, RB0, ref)
    if (t1 < 1) quad(RT1, RB1, TB1, TT1, ref)
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3))
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(N3, 3))
  return g
}
