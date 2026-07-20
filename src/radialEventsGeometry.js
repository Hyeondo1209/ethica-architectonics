// ════════════════════════════════════════════════════════════════════
//  radialEventsGeometry.js — 1p1~4 방별 사건의 순수 기하 빌더 (2026.07.12)
//  React 없음(렌즈 lensGeometry.js 전례): RadialEvents.jsx(마운트)와
//  check_rooms.mjs(검증)가 '같은 실물'을 공유한다.
//  원리·판정 = DESIGN.md §5 + 브리프. 좌표 = 꽃잎 로컬(+x 방사 바깥 = 비석 벽,
//  −x 허브 문, ±z 고리 문, 원점 = 꽃잎 축, y = 월드 높이 그대로).
//  공통 구속: 전 정점 r ≤ petalR(y)−여유(셸 밖 무돌출 = 등형·개구 보존).
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three'
import {
  petalR, P_FLOOR_TOP, P_FLOOR_R, P_DOOR_TOP, LIFT_Y,

  P2_SHEAR_Z, P2_EDGE_A, P2_EDGE_B,
  P2_RIM_A, P2_RIM_B, P2_BULGE_A, P2_BULGE_B, P2_PEAK_A, P2_PEAK_B,
  P3_GRAZE_GAP, P3_TWIST, RAD_PRX, RAD_PRY, RAD_PCY,
  P4_TILT_MAX, P4_SCALE,
} from './constants.js'

// ── P1(NE) 아직 떨어지지 않은 것들 — 미분리 융기 군집(★㉝ 양안 → ㉞ A 확정, B〔볼록 극화〕폐기: 현도 07-13) ──
//  바닥이 4곳에서 부풀되 어느 것도 분리되지 않음(이음새 0·바닥 재질) = 변용은 실체에 기대어서만 있다.
//  1p4(분리된 몸·셸 재질)와 대각 대구: 저긴 '구분된 것들', 여긴 '아직 구분되지 않은 것들'.
//  주 융기 = +x 통로 위(의도 — 비석까지 오르막), 부 융기 3 = 사분면 포켓(통로 청정).
//  프로파일 h = H·cos²(πr/2R): 중심·림 접선 0(부드러운 이륙·착지), 최대 경사 = H·π/2R(r=R/2).
export const P1A = {
  main:   { x: 9.4, z: 0, R: 3.0, H: 1.5 },     // 주 융기 — 비석(11.4)이 어깨에 얹힘(실측 리프트 ≈0.4)
  minors: [
    { x: -6.3, z: -5.3, R: 2.5, H: 1.1 },
    { x: -5.6, z: 5.9, R: 2.3, H: 0.85 },
    { x: 5.3, z: -6.5, R: 2.1, H: 0.65 },
  ],
}
const p1BumpAt = (b, x, z) => {
  const r = Math.hypot(x - b.x, z - b.z)
  return r >= b.R ? 0 : b.H * Math.cos(Math.PI * r / (2 * b.R)) ** 2
}
//  높이장(x, z) — 보행 스폰·비석 리프트의 단일 소스
export function p1HeightAt(x, z) {
  let h = p1BumpAt(P1A.main, x, z)
  for (const b of P1A.minors) h = Math.max(h, p1BumpAt(b, x, z))
  return h
}
export function buildP1Swells() {
  const NR = 20, NS = 56
  const geos = [], bumps = [P1A.main, ...P1A.minors]
  for (const b of bumps) {
    const pos = [], idx = []
    for (let i = 0; i <= NR; i++) {
      const r = b.R * i / NR
      const y = i === NR ? P_FLOOR_TOP - 0.02                       // 림 = 원판 상면 밑 0.02 매몰(이음새 은닉)
        : P_FLOOR_TOP + b.H * Math.cos(Math.PI * r / (2 * b.R)) ** 2
      for (let j = 0; j < NS; j++) {
        const th = 2 * Math.PI * j / NS
        pos.push(b.x + r * Math.cos(th), y, b.z + r * Math.sin(th))
      }
    }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) {
      const a = i * NS + j, c = i * NS + (j + 1) % NS, d = a + NS, e = c + NS
      idx.push(a, c, d, c, e, d)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setIndex(idx); g.computeVertexNormals()
    geos.push(g)
  }
  return { geos, bumps }
}

// ── P2(NW) 어긋난 두 천장(전단) ───────────────────────────────────
//  ★재작업 2026.07.12 ㉘ — 구 '능선 공유 두 볼트' 기각(로컬 실측: 계란화로 사건이 바닥 위
//  12~22m로 올라가자, 균질광에서 아래를 향한 밑면 두 장은 한 덩어리 어둠이고 이면각은
//  희미한 선 하나 = §3 ⑩ 위반. 게다가 구판은 능선 좌표를 아이러니하게 '공유'했다 —
//  공통되는 것을 갖지 않는다면서).
//  전단(shear): 두 천장이 '다른 높이'에 있어 아예 만나지 않고, 전단 평면(로컬 z=SHEAR_Z)에
//  수직 절벽면이 선다. 읽힘 채널 둘 다 이 환경 유효 채널: ①수직면은 옆을 향해 균질광에서
//  중간톤(hemi 측면광) ②전단선 아래를 가로질러 걸으면 머리 위 공간이 한 번에 점프(몸).
//  각 천장 = 전단 모서리(높이 EDGE, 직선)→제 벽 rim까지 2차 베지어 횡단(EDGE·RIM·BULGE·
//  PEAK 각자 = 다른 중심·다른 곡률 유지). rim 봉합 = 립 스커트 랩 조인트(구판 계승).
//  절벽면은 두 모서리 행과 정점을 '식 그대로' 공유해 이음 0(check_rooms가 비트 동일 검증).
export function buildP2Shear() {
  const SZ = P2_SHEAR_Z
  const NX = 72, NT = 20
  const mkSide = (sgn, EDGE, RIM, BULGE, PK) => {
    const XR = Math.sqrt(Math.max(0.01, (petalR(EDGE) - 0.06) ** 2 - SZ * SZ))  // 전단 모서리 x 반폭(셸내면−0.06)
    const cols = [], pos = []
    for (let j = 0; j <= NX; j++) {
      const x = -XR + 2 * XR * j / NX
      const rimY = RIM + (EDGE - RIM) * Math.min(1, Math.abs(x) / XR) ** 4     // 끝에서 rim→EDGE 수렴(모서리와 닫힘)
      const rw = Math.max(0, petalR(rimY) - 0.05)                              // rim 원 반경(셸내면−0.05)
      let zw = sgn * Math.sqrt(Math.max(0, rw * rw - x * x))
      zw = sgn > 0 ? Math.max(SZ, zw) : Math.min(SZ, zw)                       // 전단면 너머로 뒤집힘 방지
      const g = Math.sqrt(Math.max(0, 1 - (x / XR) ** 2))                      // 불룩 테이퍼(끝에서 0)
      const P1z = SZ + PK * (zw - SZ), P1y = EDGE + BULGE * g                  // 베지어 제어점
      for (let i = 0; i <= NT; i++) {
        const t = i / NT, u = 1 - t
        pos.push(x, u * u * EDGE + 2 * u * t * P1y + t * t * rimY,
                    u * u * SZ + 2 * u * t * P1z + t * t * zw)
      }
      //  스커트 정점: rim에서 아래·바깥(셸내면−0.12) — 문 상단 아래로는 안 내려감
      const th = Math.atan2(zw, x)
      const y2 = Math.max(rimY - 0.55, P_DOOR_TOP + 0.15)
      const r2 = Math.max(0.1, petalR(y2) - 0.12)
      pos.push(r2 * Math.cos(th), y2, r2 * Math.sin(th))
      cols.push({ x, zw, rimY })
    }
    const ROWS = NT + 2, idx = []
    for (let j = 0; j < NX; j++) for (let i = 0; i < ROWS - 1; i++) {
      const a = j * ROWS + i, b = (j + 1) * ROWS + i
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    return { geo, cols, XR }
  }
  const A = mkSide(-1, P2_EDGE_A, P2_RIM_A, P2_BULGE_A, P2_PEAK_A)   // −z: 낮은 천장(압박)
  const B = mkSide(+1, P2_EDGE_B, P2_RIM_B, P2_BULGE_B, P2_PEAK_B)   // +z: 높은 천장(계란 층고 유지)
  //  절벽면: z=SZ 수직면, 낮은 모서리(EDGE_A)→높은 모서리(EDGE_B). 행별 x반폭 = 셸내면−0.06
  //  — 바닥/상단 행의 반폭 식이 각 천장의 XR과 동일 → 모서리 정점 비트 동일(이음 0).
  const NYF = 16, posF = []
  for (let i = 0; i <= NYF; i++) {
    const y = P2_EDGE_A + (P2_EDGE_B - P2_EDGE_A) * i / NYF
    const w = Math.sqrt(Math.max(0.01, (petalR(y) - 0.06) ** 2 - SZ * SZ))
    for (let j = 0; j <= NX; j++) posF.push(-w + 2 * w * j / NX, y, SZ)
  }
  const idxF = []
  for (let i = 0; i < NYF; i++) for (let j = 0; j < NX; j++) {
    const a = i * (NX + 1) + j, b = a + NX + 1
    idxF.push(a, a + 1, b, a + 1, b + 1, b)
  }
  const geoFace = new THREE.BufferGeometry()
  geoFace.setAttribute('position', new THREE.Float32BufferAttribute(posF, 3))
  geoFace.setIndex(idxF)
  geoFace.computeVertexNormals()
  return { geoA: A.geo, geoB: B.geo, geoFace,
    meta: { NT, NX, NYF, SZ, colsA: A.cols, colsB: B.cols, XRA: A.XR, XRB: B.XR } }
}

// ── P3(SW) 천장 인발 4기 ──────────────────────────────────────────
//  ★재작업 2026.07.12 ㉙(구 '두 팔' 폐기 — 현도: 아이디어는 좋되 미학이 별로 → 신안 스케치 구술).
//  "점토로 빚어진 천장을 쭉 당긴" 이질적 조형 4기 — 나선(곡선·연속) / 굽은 직육면체(직선체·꺾임) /
//  타일 사슬(이산·연쇄) / 비틀린 띠(면·두께 0.16 — 2차 교체: 접힌 리본은 '꺾인 각재'라 직육면체와 어휘가 겹쳤다).
//  형태 어휘에 공통이 없다(1p3 "공통점 없는 사물들").
//  ⚠부착 아님 = 인발(引拔): 뿌리마다 셸 내면에서 오목하게 벌어져 내려오는 플레어 + 둥근 목이
//  각자의 단면으로 '펴지며' 제 형태가 됨(모프) — 방 자신의 변형(부착 금지 구속, 개정 없이 존치).
//  구도(현도 확정 — '좌절된 인과 ↔ 무관심한 이질성 사이의 역동'을 3층으로):
//   ①근접 출발: 네 뿌리가 천장 중심부(축 오프셋 ≤3.2)의 유사한 곳 — 같은 점은 아님
//   ②발산: 각자 다른 방향·길이로 뻗어 서로를 향하지 않음(비스침 쌍 끝 방위 ≥50°)
//   ③스침 한 쌍: 나선↔리본만 중간에서 P3_GRAZE_GAP까지 접근했다 벌어짐("닿을 뻔"의 유산).
//     리본 접점(F2)을 나선 곡선 위 실측점 t=0.35에서 파생 — 노브를 바꿔도 간극이 따라온다.
//  전부 정적(움직이는 모빌 = 2부 16~36 예약 어휘). 재질 = 셸 동일(같은 점토에서 뽑힘이 직독).
//  끝 = 넷 다 머리 위(최저 끝 y − 바닥 ≥ P3_TIP_CLEAR — 현도 4항).
const yCeilIn = (r) => RAD_PCY + RAD_PRY * Math.sqrt(Math.max(0, 1 - (r / RAD_PRX) ** 2))  // 셸 내면 천장고(축 오프셋 r)

//  ── 인발 스펙(뿌리·목·정체 단면·경로) — 개별 수치의 정본. 좌표 = 사건 로컬(P3_AZ로 통째 회전) ──
const P3S = {
  spiral: { r0: 1.6, az0: 15, RR: 1.00, rTop: 0.42,
    turns: 2.3, hr: [0.7, 1.6], tube: [0.30, 0.15], driftAz: 50, driftMag: 5.0, tipY: LIFT_Y + 48.5 },   // tipY = 머리 스침(현도 ③ · ★㊵ 부양 동반 +Δ)
  cuboid: { r0: 2.8, az0: 150, RR: 1.15, rTop: 0.62,
    sec: { w: 0.42, h: 0.32, e: 5 }, path: [[-2.9, LIFT_Y + 66.3, 2.1], [-4.8, LIFT_Y + 61.0, 3.9], [-7.1, LIFT_Y + 56.0, 4.7]] },   // ★㊵ +Δ
  tiles:  { r0: 2.1, az0: 255, RR: 1.05, rTop: 0.72,
    n: 15, side: 0.86, th: 0.15, stepH: 0.40, stepY: 1.18, azCurl: 3.2 },
  ribbon: { r0: 3.2, az0: 325, RR: 1.10, rTop: 0.65,
    sec: { w: 0.55, h: 0.08, e: 8 },                       // 두께 0.16 — "면이되 두께감"(현도 3항)
    twist: P3_TWIST,                                       // ★비틀린 띠(2차 — 접힌 미터 관절이 직육면체와 같은 어휘라 겹쳐 보임〔현도 ②〕). 노브 정본 = constants.js
    dF1: [1.1, 3.4, -1.5], dF3: [2.4, -6.4, -1.9], dF4: [2.2, -5.4, -1.4] },  // F2(스침점) 기준 상대 체인 — 꼬리는 −z(나선 진로 +z의 반대: 스친 뒤 확실히 갈라섬)
}
const NECK = { w: 0.34, h: 0.34, e: 2 }                     // 인발 목(둥근 관 — 플레어 립 0.45·rTop 안을 관입 봉합)

//  ── 소도구: 인덱스 기하 누산 / 벡터 / 슈퍼타원 링 / 스윕 / 24정점 박스 ──
const acc0 = () => ({ pos: [], idx: [] })
function ringStrip(A, r0, r1) {                             // 두 링(같은 점수)을 사이드 쿼드로
  const n = r1.length, b0 = A.pos.length / 3
  r0.forEach(v => A.pos.push(...v)); r1.forEach(v => A.pos.push(...v))
  for (let i = 0; i < n; i++) {
    const a = b0 + i, b = b0 + (i + 1) % n, c = a + n, d = b + n
    A.idx.push(a, b, c, b, d, c)
  }
}
function fan(A, ring, apex, flip) {
  const n = ring.length, b0 = A.pos.length / 3
  ring.forEach(v => A.pos.push(...v)); A.pos.push(...apex)
  for (let i = 0; i < n; i++) {
    const a = b0 + i, b = b0 + (i + 1) % n
    flip ? A.idx.push(b, a, b0 + n) : A.idx.push(a, b, b0 + n)
  }
}
const vN = (v) => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
const vX = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
//  ⚠프레임 = 평행이송(rotation-minimizing frame). 구판(접선×고정 ref로 매 링 재계산 + 부호 뒤집힘 가드)은
//  ①근수직 구간에서 u가 요동 ②비틀림(roll)을 준 u를 다음 링의 기준으로 넘겨 누적각 90° 초과 시 매 구간 180° 뒤집힘
//  → 띠가 나사송곳이 됨(2026.07.12 실측: 40구간 중 26구간이 173° 플립. 현도 "너무 과하게 비틀림" 신고의 진짜 원인).
//  이송 = 직전 u를 새 접선의 수직면에 투영해 정규화(비틀림 주입 0). roll은 '점 배치'에만 쓰고, 다음 링에 넘기는 기준은 언제나 이송된 u.
function secRing(P, T, w, h, e, n, uPrev, roll = 0) {
  let u
  if (uPrev) {                                             // 평행이송: 직전 u − T성분(있던 방향을 최대한 유지)
    const d = uPrev[0] * T[0] + uPrev[1] * T[1] + uPrev[2] * T[2]
    const pj = [uPrev[0] - T[0] * d, uPrev[1] - T[1] * d, uPrev[2] - T[2] * d]
    u = Math.hypot(...pj) > 1e-6 ? vN(pj) : vN(vX(T, [0, 1, 0]))
  } else {
    u = vN(vX(T, Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]))   // 첫 링만 고정 ref로 개시
  }
  const uBase = u                                          // ★다음 링에 넘기는 기준(비틀림 미적용 — 이게 구판 버그의 핵심)
  let v = vN(vX(T, u))
  if (roll) {
    const cr = Math.cos(roll), sr = Math.sin(roll)
    const u2 = [u[0] * cr + v[0] * sr, u[1] * cr + v[1] * sr, u[2] * cr + v[2] * sr]
    v = [-u[0] * sr + v[0] * cr, -u[1] * sr + v[1] * cr, -u[2] * sr + v[2] * cr]; u = u2
  }
  const pts = []
  for (let i = 0; i < n; i++) {
    const th = 2 * Math.PI * i / n, c = Math.cos(th), sn = Math.sin(th)
    const a = Math.sign(c) * Math.abs(c) ** (2 / e), b = Math.sign(sn) * Math.abs(sn) ** (2 / e)
    pts.push([P[0] + u[0] * w * a + v[0] * h * b, P[1] + u[1] * w * a + v[1] * h * b, P[2] + u[2] * w * a + v[2] * h * b])
  }
  return { pts, u: uBase, uRoll: u }   // u = 다음 링 기준(이송), uRoll = 이 링이 실제로 그려진 방향(검증용)
}
function sweep(A, path, secAt, n = 16) {                    // secAt(i)→{w,h,e,roll}; 목→정체 모프는 secAt이 담당. 반환 = 링별 실제 단면 방향(프레임 검증용)
  let prev = null, uPrev = null
  const rolled = []
  for (let i = 0; i < path.length; i++) {
    const T = vN(i === 0 ? [path[1][0] - path[0][0], path[1][1] - path[0][1], path[1][2] - path[0][2]]
      : i === path.length - 1 ? [path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]]
      : [path[i + 1][0] - path[i - 1][0], path[i + 1][1] - path[i - 1][1], path[i + 1][2] - path[i - 1][2]])
    const { w, h, e, roll = 0 } = secAt(i, path.length - 1)
    const r = secRing(path[i], T, w, h, e, n, uPrev, roll)
    if (prev) ringStrip(A, prev, r.pts)
    if (i === path.length - 1) {                            // 끝캡(팬 — 살짝 돌출한 뭉툭 코)
      const tip = [path[i][0] + T[0] * 0.18, path[i][1] + T[1] * 0.18, path[i][2] + T[2] * 0.18]
      fan(A, r.pts, tip, false)
    }
    prev = r.pts; uPrev = r.u; rolled.push(r.uRoll)
  }
  return rolled
}
function box24(A, c, half, rotY, tiltX) {                   // 타일: 면별 정점 24(크리스프 — 점토 사이의 이산 이물감)
  const [hx, hy, hz] = half, cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(tiltX), sx = Math.sin(tiltX)
  const tf = ([x, y, z]) => {                               // tiltX(로컬 x축) → rotY → 평행이동
    const y1 = y * cx - z * sx, z1 = y * sx + z * cx
    return [c[0] + x * cy + z1 * sy, c[1] + y1, c[2] - x * sy + z1 * cy]
  }
  const F = [
    [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]],
    [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]],
    [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]],
    [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]],
    [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]],
    [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]],
  ]
  for (const f of F) {
    const b0 = A.pos.length / 3
    f.forEach(v => A.pos.push(...tf(v)))
    A.idx.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3)
  }
}
function flare(A, cx, cz, RR, rTop, yTop) {                 // 인발 플레어: 셸 내면 링(점별 침하 0.04) → 오목 드립 → 목 → 안쪽 립
  const n = 20, ring = (rr, yFix) => {
    const pts = []
    for (let i = 0; i < n; i++) {
      const th = 2 * Math.PI * i / n, x = cx + rr * Math.cos(th), z = cz + rr * Math.sin(th)
      pts.push([x, yFix ?? (yCeilIn(Math.hypot(x, z)) - 0.04), z])
    }
    return pts
  }
  const y0 = yCeilIn(Math.hypot(cx, cz)) - 0.04
  const r0 = ring(RR), r1 = ring(RR * 0.62 + rTop * 0.38, y0 * 0.58 + yTop * 0.42)
  const r2 = ring(rTop, yTop), r3 = ring(rTop * 0.45, yTop + 0.35)   // 립: 목 안쪽 위로 말림(몸통 관입 봉합)
  ringStrip(A, r0, r1); ringStrip(A, r1, r2); ringStrip(A, r2, r3)
}

export function buildP3Pulls() {
  const rad = (d) => d * Math.PI / 180
  const rootOf = (S) => [S.r0 * Math.cos(rad(S.az0)), S.r0 * Math.sin(rad(S.az0))]
  const geoOf = (A) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(A.pos, 3))
    g.setIndex(A.idx); g.computeVertexNormals()
    return g
  }
  const morph = (id, k0 = 0.28) => (i, K) => {              // 목(NECK)→정체 단면 모프(경로 앞 k0 구간)
    const t = Math.min(1, (i / K) / k0)
    return { w: NECK.w + (id.w - NECK.w) * t, h: NECK.h + (id.h - NECK.h) * t, e: NECK.e + (id.e - NECK.e) * t }
  }
  const tips = [], roots = []

  // ① 나선 — 곡선·연속
  const S1 = P3S.spiral, R1 = rootOf(S1)
  const yTop1 = yCeilIn(S1.r0) - 2.4, dAz = rad(S1.driftAz)
  const spiralP = (t) => {
    const c = [R1[0] + Math.cos(dAz) * S1.driftMag * t, R1[1] + Math.sin(dAz) * S1.driftMag * t]
    const th = -Math.PI / 2 + t * 2 * Math.PI * S1.turns
    const ramp = Math.min(1, t / 0.14) ** 2 * (3 - 2 * Math.min(1, t / 0.14))   // 감김 반경 0→정상(목 축에서 감겨 나옴 — 현도 오류① 수정)
    const hr = (S1.hr[0] + (S1.hr[1] - S1.hr[0]) * t) * ramp
    return [c[0] + hr * Math.cos(th), yTop1 + 0.3 - t * (yTop1 + 0.3 - S1.tipY), c[1] + hr * Math.sin(th)]
  }
  const A1 = acc0(); flare(A1, R1[0], R1[1], S1.RR, S1.rTop, yTop1)
  const K1 = 72, path1 = Array.from({ length: K1 + 1 }, (_, i) => spiralP(i / K1))
  const m1 = morph({ w: 0, h: 0, e: 2 })                    // 정체 = 원(반경은 아래서 t 보간)
  sweep(A1, path1, (i) => {
    const base = m1(i, K1), tr = S1.tube[0] + (S1.tube[1] - S1.tube[0]) * (i / K1)
    return { w: Math.max(base.w, tr), h: Math.max(base.h, tr), e: 2 }
  }, 14)
  tips.push(path1[K1]); roots.push({ x: R1[0], z: R1[1], RR: S1.RR, rTop: S1.rTop })

  // ② 굽은 직육면체 — 직선체·꺾임
  const S2 = P3S.cuboid, R2 = rootOf(S2)
  const yTop2 = yCeilIn(S2.r0) - 2.4
  const A2 = acc0(); flare(A2, R2[0], R2[1], S2.RR, S2.rTop, yTop2)
  const path2 = [[R2[0], yTop2 + 0.3, R2[1]], ...S2.path]
  sweep(A2, path2, morph(S2.sec), 16)
  tips.push(S2.path[S2.path.length - 1]); roots.push({ x: R2[0], z: R2[1], RR: S2.RR, rTop: S2.rTop })

  // ③ 타일 사슬 — 이산·연쇄(크리스프 박스 = 점토 사이의 이물감)
  const S3 = P3S.tiles, R3 = rootOf(S3)
  const yTop3 = yCeilIn(S3.r0) - 2.4
  const A3 = acc0(); flare(A3, R3[0], R3[1], S3.RR, S3.rTop, yTop3)
  const neckEnd = [R3[0] - 0.12, yTop3 - 0.55, R3[1] - 0.3]
  sweep(A3, [[R3[0], yTop3 + 0.3, R3[1]], neckEnd], () => NECK, 12)  // 짧은 목 — 첫 타일이 목에 맺힘
  let cx3 = neckEnd[0], cz3 = neckEnd[2], y3 = neckEnd[1] - 0.35, lastC
  for (let k = 0; k < S3.n; k++) {
    const az = rad(S3.az0 - k * S3.azCurl)
    box24(A3, [cx3, y3, cz3], [S3.side / 2, S3.th / 2, S3.side / 2],
      az + (k % 2 ? 0.42 : -0.35), (k % 3 - 1) * 0.34 + 0.18)        // 결정론 지터(시드 불필요 — 고정 패턴)
    lastC = [cx3, y3, cz3]
    cx3 += S3.stepH * Math.cos(az); cz3 += S3.stepH * Math.sin(az); y3 -= S3.stepY
  }
  tips.push(lastC); roots.push({ x: R3[0], z: R3[1], RR: S3.RR, rTop: S3.rTop })

  // ④ 비틀린 띠 — 면·두께 0.16. 접점 F2 = 나선 t=0.35 실측점 + 법선 오프셋(스침 파생) → 2패스 실측 보정
  const S4 = P3S.ribbon, R4 = rootOf(S4)
  const yTop4 = yCeilIn(S4.r0) - 2.4
  const gp = spiralP(0.35)
  const cAt = [R1[0] + Math.cos(dAz) * S1.driftMag * 0.35, R1[1] + Math.sin(dAz) * S1.driftMag * 0.35]
  const nH = vN([gp[0] - cAt[0], 0, gp[2] - cAt[1]])
  const tubeAt = S1.tube[0] + (S1.tube[1] - S1.tube[0]) * 0.35
  //  카트멀-롬으로 다섯 접점을 매끈히 통과(F2 = 스침점 보존) + 연속 비틀림 → '띠'가 직육면체(직선·꺾임)와 완전히 갈라짐
  const cr1 = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3)
  const m4 = morph(S4.sec, 0.35), K4 = 40
  const mkRibbon = (off) => {                              // 접점 F2를 나선에서 off만큼 띄우고 띠 전체를 F2 기준으로 세움
    const c2 = [gp[0] + nH[0] * off, gp[1], gp[2] + nH[2] * off]
    const f1 = [c2[0] + S4.dF1[0], c2[1] + S4.dF1[1], c2[2] + S4.dF1[2]]
    const f3 = [c2[0] + S4.dF3[0], c2[1] + S4.dF3[1], c2[2] + S4.dF3[2]]
    const f4 = [f3[0] + S4.dF4[0], f3[1] + S4.dF4[1], f3[2] + S4.dF4[2]]
    const CP = [[R4[0], yTop4 + 0.3, R4[1]], f1, c2, f3, f4], path = []
    for (let i = 0; i <= K4; i++) {
      const q = i / K4 * (CP.length - 1), k = Math.min(CP.length - 2, Math.floor(q)), t = q - k
      const g = j => CP[Math.max(0, Math.min(CP.length - 1, k + j))]
      path.push([0, 1, 2].map(ax => cr1(g(-1)[ax], g(0)[ax], g(1)[ax], g(2)[ax], t)))
    }
    const A = acc0(); flare(A, R4[0], R4[1], S4.RR, S4.rTop, yTop4)
    const fr = sweep(A, path, (i, K) => ({ ...m4(i, K), roll: S4.twist * i / K }), 16)
    let jump = 0                                           // ★프레임 뒤집힘 가드: 링 사이 단면 회전이 튀면 나사송곳(07-12 버그)
    for (let i = 1; i < fr.length; i++) {
      const d = Math.max(-1, Math.min(1, fr[i][0] * fr[i - 1][0] + fr[i][1] * fr[i - 1][1] + fr[i][2] * fr[i - 1][2]))
      jump = Math.max(jump, Math.acos(d) * 180 / Math.PI)
    }
    return { A, F2: c2, tip: f4, jump }
  }
  //  2패스 실측 보정: 비틀림·단면을 바꾸면 나선을 향한 띠의 실두께가 변한다 → 눈대중 상수 대신 실제 표면거리로 GAP을 맞춘다.
  const zoneMin = (pa, pb, y0, y1) => {                    // 스침권(y 구간) 표면 정점 실최근접
    const pick = p => { const o = []; for (let i = 0; i < p.length; i += 3) if (p[i + 1] >= y0 && p[i + 1] <= y1) o.push([p[i], p[i + 1], p[i + 2]]); return o }
    const a = pick(pa), b = pick(pb)
    let m = Infinity
    for (const q of a) for (const r of b) { const d = Math.hypot(q[0] - r[0], q[1] - r[1], q[2] - r[2]); if (d < m) m = d }
    return m
  }
  const off0 = P3_GRAZE_GAP + tubeAt + Math.hypot(S4.sec.w, S4.sec.h)   // 보수적 초기값(단면 최대 반경)
  const rb0 = mkRibbon(off0)
  const d0 = zoneMin(A1.pos, rb0.A.pos, gp[1] - 5, gp[1] + 5)
  const rb = Number.isFinite(d0) ? mkRibbon(off0 + (P3_GRAZE_GAP - d0)) : rb0   // 실측 오차만큼 되밀기
  const A4 = rb.A, F2 = rb.F2, F4 = rb.tip
  tips.push(F4); roots.push({ x: R4[0], z: R4[1], RR: S4.RR, rTop: S4.rTop })

  return { geos: [geoOf(A1), geoOf(A2), geoOf(A3), geoOf(A4)], names: ['나선', '굽은 직육면체', '타일 사슬', '비틀린 띠'],
    meta: { roots, tips, grazePair: [0, 3], F2, yTops: [yTop1, yTop2, yTop3, yTop4], twistJumpMax: rb.jump } }
}

// ── P4(SE) 뚫린 것과 막힌 것 — 무어 군집(★㉛ 양안 → ㉜ A 확정, B〔넘어짐 연작〕폐기: 현도 07-13) ──
//  1p4 "여럿은 속성 또는 변용에 의해 구분된다" — 같은 와상 덩어리 7기(무어 라임), 3기만 몸통 관통(CSG 정공법).
//  위상 = 질적 차이의 직역(연속 변형으로 못 넘어감 — 구멍은 '조금' 있을 수 없다) ↔ 기울어짐 x단조 0→TILT_MAX
//  = 변용(연속)이 관통/막힘 두 종족을 무차별 관통 → 두 구분 축의 독립이 몸으로 읽힘. 사분면 포켓 산포(십자 통로 청정).
//  재질 = 셸(바닥 융기 1p1과 구분). 전체 크기 = P4_SCALE(constants — 현도 "좀 키워줘" 07-13, 기본 1.35).
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

//  스펙(개별 수치 정본 — 치수는 P4_SCALE 곱 전 기준). 사분면 포켓 배치(십자 통로 회피), 기울기 = x 오름차순 단조
const P4A = {
  L: 2.6, H: 1.15, W: 1.5, SINK: 0.14,            // 와상 덩어리 전장·높이·폭(전 기 동일 = 같은 몸)·바닥 안착 매몰
  HOLE_R: 0.42,
  pos: [                                           //  x, z, yaw(도) — 7기, 포켓당 1~2기
    { x: -7.9, z: -5.2, yaw: 18 }, { x: -5.2, z: -7.9, yaw: -34 },
    { x: -6.9, z: 5.9, yaw: 55 },  { x: -4.4, z: 8.3, yaw: -12 },
    { x: 4.6, z: -6.2, yaw: 40 },  { x: 8.3, z: -4.9, yaw: -25 },
    { x: 6.3, z: 6.8, yaw: 8 },
  ],
  pierced: [1, 3, 5],                              //  관통 3기(x순위 비인접)
}
const bakeXform = (geo, rx, ry, rz, tx, ty, tz) => {
  if (rz) geo.rotateZ(rz); if (rx) geo.rotateX(rx); if (ry) geo.rotateY(ry)
  geo.translate(tx, ty, tz); return geo
}
const minYOf = (geo) => { geo.computeBoundingBox(); return geo.boundingBox.min.y }

export function buildP4A() {
  const ev = new Evaluator()
  const SC = P4_SCALE                              // 전체 확대(치수만 — 배치 좌표는 불변: 포켓·통로 관계 유지)
  const ranked = [...P4A.pos].map((p, i) => ({ ...p, i })).sort((a, b) => a.x - b.x)
  const geos = [], meta = []
  ranked.forEach((p, rank) => {
    const tilt = P4_TILT_MAX * rank / (ranked.length - 1)
    let g = new THREE.SphereGeometry(1, 30, 20)
    g.scale(SC * P4A.L / 2, SC * P4A.H / 2, SC * P4A.W / 2)
    const pierced = P4A.pierced.includes(rank)
    if (pierced) {                                  //  관통: 몸통 옆구리를 z축(폭 방향)으로 뚫음 — CSG 정공법
      const hole = new THREE.CylinderGeometry(SC * P4A.HOLE_R, SC * P4A.HOLE_R, SC * P4A.W * 3, 24)
      hole.rotateX(Math.PI / 2)
      hole.translate(SC * 0.18, SC * 0.06, 0)                 //  구멍 중심을 살짝 위·앞으로(무어 — 정중앙은 기계적)
      const a = new Brush(g); a.updateMatrixWorld()
      const b = new Brush(hole); b.updateMatrixWorld()
      g = ev.evaluate(a, b, SUBTRACTION).geometry
    }
    const roll = tilt * (p.x > 0 ? 1 : -1)          //  기울어짐 = 장축 둘레 옆으로 눕는 롤(방 중심 반대쪽으로)
    bakeXform(g, roll, p.yaw * Math.PI / 180, 0, 0, 0, 0)
    const lift = P_FLOOR_TOP - minYOf(g) - P4A.SINK * P4A.H * SC
    g.translate(p.x, lift, p.z)
    geos.push(g)
    meta.push({ x: p.x, z: p.z, tilt, pierced,
      holeAxis: pierced ? { cx: p.x, cz: p.z, yaw: p.yaw * Math.PI / 180, roll } : null })
  })
  return { geos, meta, spec: P4A }
}

