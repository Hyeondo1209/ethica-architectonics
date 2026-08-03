// axiomSpiralGeometry.js — ★107 공리 나선 매스화 + 지지 체계 (2026.08.03 현도 결정)
//  현도 잠금: **위에서 내려다본 평면 나선(r45→14 · 2바퀴 · 도착 37.5°)이 지킬 아름다움이다.**
//   → 반경 궤적·회전수·도착 방위는 이 모듈이 절대 안 건드린다(구판 `corner()`와 같은 식).
//
//  ★잠금이 강제한 것(노브 아님 — 재유도 금지, 실측 정본):
//   ⓐ **평균 경사 7.74°가 잠긴다.** 수평 경로 362.5(8각) ÷ 상승 49.30. 형태를 원형으로 바꿔도 372.1로
//     9.6밖에 안 움직인다. 블롱델 2R+G를 통례(0.64)에 맞추면 단높이 0.068·720칸 = 계단이 아니다.
//     ⛔**그래서 '연속 계단은 불가'라고 결론냈던 것은 오답이었다(현도 정정 2026.08.03).** 블롱델 통례는
//     *평지 계단*의 규격이고, 이 건물은 이미 **완만한 경사에 단을 새기는 어법**을 두 번 합격시켰다:
//     ★89 테라스(단높이 0.417 · 디딤 1.715 · 14.09° · 밑면 'ramp' 경사 매스)와 ★80 나팔(0.240 · 30°).
//     → **매스 몸통 + 윗면 단 새김**이 정본이다. 낱장 복귀 = `SPIRAL_BODY='treads'` 한 줄.
//   ⓔ **단은 변마다 정수로 끊는다.** 8각 변 16개 · 변당 상승 3.081(BIAS=1이라 균일) → 변당 n단이면
//     단높이가 전 구간 균일해진다. 대가 = **디딤이 변마다 줄어든다**(첫 변 4.82 → 끝 변 1.66, n=7).
//     그건 결함이 아니라 나선 계단의 성질이다(안쪽이 가파르다). 검사가 최소 디딤을 잰다.
//   ⓑ **위아래 코일은 평면에서 안 겹친다** — 한 바퀴당 반경 감소 15.50 > 폭 2.4. 폭이 15.5를 넘기
//     전까지 두께는 헤드룸 제약을 안 받는다. 그래서 §2-D 2 '속 찬 매스 + 깎인 밑면'이 성립한다.
//   ⓒ **지지는 37:63으로 갈린다.** 판 구멍(각뿔대 입술 r33.5) 위를 나선이 f=0.371(칸 52)에서 넘는다.
//     아래는 판이 받고(②기둥 — 높이 0~18.3), 위는 판이 없다(①벽 보 — 스팬 15.7~27.2).
//     이 경계는 우연이 아니라 `PIT_R_TOP + PIT_WALL_T`의 파생이다. 각뿔대를 밀면 지지가 따라 움직인다.
//   ⓓ **벽 보는 한 바퀴 아래 코일 위를 가로지른다**(f 0.5~0.8 실측). 코일 간 높이차 24.65가 상수라
//     보춤 여유도 상수 22.1이다 — 지지가 '옆에 붙은 구조'가 아니라 **아래를 걷는 사람의 천장**이 된다.
//
//  ★법선: 8각 폴리라인 스윕이므로 **평면 법선이 옳다**(각져야 맞다). `computeVertexNormals()` 안 쓴다.
//  ⚠수치 정본 = constants.js SPIRAL/SUP 블록 주석. 여기엔 '어떻게'만 둔다.
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three'
import {
  ROOM_FLOOR_Y, ROOM_FLOOR_LIFT, wallR,
  ROOM_STAIR_SIDES, ROOM_STAIR_TURNS, ROOM_STAIR_WIDTH, ROOM_STAIR_BIAS,
  ROOM_STAIR_ROUT, ROOM_STAIR_RIN, ROOM_STAIR_PHASE,
  COR_Y0, COR_THICK,
  PIT_ON, PIT_R_TOP, PIT_WALL_T,
  SPIRAL_MASS_T, SPIRAL_CHAMF, SPIRAL_SUP, SPIRAL_TREAD_ON, SPIRAL_RISE_SEED, SPIRAL_SOFFIT,
  SUP_COL_GAP, SUP_COL_R, SUP_COL_MIN, SUP_COL_SIDES, SUP_COL_INSET, SUP_COL_PAD,
  SUP_BEAM_GAP, SUP_BEAM_DEPTH, SUP_BEAM_W, SUP_WALL_CLR, SUP_BEAM_MIN, SUP_BEAM_DMIN,
  SUP_BEAM_TAPER, SUP_BEAM_CURVE, SUP_BEAM_SEGS, SUP_BEAM_W_TAPER,
  SUP_BEAM_NOSE_LIP, SUP_BEAM_NOSE_RUN, SUP_BEAM_W_NOSE,
  SUP_BEAM_ROOT_SPLAY, SUP_BEAM_ROOT_GROW, SUP_BEAM_FILLET,
  SUP_HEAD_MIN,
} from './constants.js'

// ── 좌표 규약: 방위 az에서 반경 r · 접선 오프셋 u · 높이 y ──
const fp = (az, r, u, y) => [r * Math.cos(az) - u * Math.sin(az), y, r * Math.sin(az) + u * Math.cos(az)]

//  ⚠퇴화(면적 0)면 **null**을 돌려준다 — `|| 1` 로 나누면 길이 0짜리 법선이 나가서 검사가
//   '법선 편차 1.0'으로 운다(2026.08.03 실측). 챌판에서 밑면 사각형이 통째로 퇴화하는 게 원인이었다.
const faceN = (a, b, c) => {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2]
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2]
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
  const L = Math.hypot(nx, ny, nz)
  return L < 1e-10 ? null : [nx / L, ny / L, nz / L]
}
function tri(P, Nn, a, b, c, n) {
  for (const v of [a, b, c]) P.push(v[0], v[1], v[2])
  for (let i = 0; i < 3; i++) Nn.push(n[0], n[1], n[2])
}
//  ★법선을 손으로 찍지 않는다 — want 방향만 주고 감김은 여기서 맞춘다(★102-2 '자가교차·감김 뒤집힘' 교훈).
//  ⚠검사가 실제로 잡았다(2026.08.03): 기둥 캡을 `tri(..., [0,1,0])`로 직접 찍었더니 부채 감김이
//   반대라 144삼각이 컬링됐다. 캡도 반드시 이 경로를 탄다.
function triTo(P, Nn, a, b, c, want) {
  const n = faceN(a, b, c)
  if (!n) return                                   // 퇴화 삼각 = 안 낸다
  if (n[0] * want[0] + n[1] * want[1] + n[2] * want[2] < 0) { tri(P, Nn, a, c, b, faceN(a, c, b)); return }
  tri(P, Nn, a, b, c, n)
}
//  법선이 want 쪽을 보도록 감김을 맞춰 사각형 하나를 놓는다(감김을 손으로 세지 않는다 — ★102-2 교훈).
//  ★사각형을 두 삼각으로 내되 **각각 퇴화 검사**를 통과시킨다 — 챌판에서는 한쪽만 살아남는다.
function quadTo(P, Nn, a, b, c, d, want) {
  triTo(P, Nn, a, b, c, want)
  triTo(P, Nn, a, c, d, want)
}

// ══════════════════════════════════════════════════════════════
//  스펙 — 검사·Room.jsx·웨이포인트가 전부 여기서 읽는다(사본 금지)
// ══════════════════════════════════════════════════════════════
export function spiralSpec() {
  const N_SEG   = Math.max(3, Math.round(ROOM_STAIR_TURNS * ROOM_STAIR_SIDES))
  const SEG_ANG = (Math.PI * 2) / ROOM_STAIR_SIDES
  const TOTAL   = N_SEG * SEG_ANG
  const yTopEnd = COR_Y0 + COR_THICK / 2            // 도착 = 착지 디스크 고리 윗면
  const CLIMB   = yTopEnd - ROOM_FLOOR_Y
  const plateY  = ROOM_FLOOR_Y + ROOM_FLOOR_LIFT    // 판 윗면(기둥이 서는 면)

  const rAt  = (f) => ROOM_STAIR_ROUT + (ROOM_STAIR_RIN - ROOM_STAIR_ROUT) * f
  const yAt  = (f) => ROOM_FLOOR_Y + CLIMB * Math.pow(f, ROOM_STAIR_BIAS)   // 윗면(밟는 면)
  const azAt = (f) => ROOM_STAIR_PHASE + f * TOTAL
  const ptAt = (f) => { const r = rAt(f), a = azAt(f); return [r * Math.cos(a), r * Math.sin(a)] }

  //  ★지지 교대 경계 = 판 구멍 반경의 파생(각뿔대를 밀면 여기가 따라 움직인다 — 결합 설계)
  const rHole = PIT_ON ? PIT_R_TOP + PIT_WALL_T : 0
  const fHole = rHole > 0
    ? Math.min(1, Math.max(0, (ROOM_STAIR_ROUT - rHole) / (ROOM_STAIR_ROUT - ROOM_STAIR_RIN)))
    : 1

  //  코너 폴리라인 + 누적 수평 길이(지지 균등 배치는 f가 아니라 **호길이** 기준 — KneeWalk 교훈)
  const corners = [], cum = [0]
  for (let k = 0; k <= N_SEG; k++) corners.push(ptAt(k / N_SEG))
  for (let k = 1; k <= N_SEG; k++) {
    const a = corners[k - 1], b = corners[k]
    cum.push(cum[k - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const pathLen = cum[N_SEG]
  //  호길이 L → f (코너 사이는 선형)
  const fAtLen = (L) => {
    if (L <= 0) return 0
    if (L >= pathLen) return 1
    let k = 0
    while (k < N_SEG - 1 && cum[k + 1] < L) k++
    const span = cum[k + 1] - cum[k]
    return (k + (span > 1e-9 ? (L - cum[k]) / span : 0)) / N_SEG
  }

  //  경계의 **호길이** — 두 지지 체제가 여기서 만난다(양쪽이 이 점에서 바깥으로 벌어져 배치된다).
  //  ⚠구판은 양쪽 다 L=0에서 간격을 셌다 → 경계에 24짜리 공백이 남았다(실측 적발).
  let Lhole = 0
  { let lo = 0, hi = pathLen
    for (let it = 0; it < 50; it++) { const mid = (lo + hi) / 2; if (fAtLen(mid) < fHole) lo = mid; else hi = mid }
    Lhole = hi }   // ⚠hi를 쓴다 — lo는 fAtLen<fHole이라 경계의 첫 보가 스스로 걸러진다(부동소수 함정)

  //  ★폴리라인 위 점 — `ptAt(f)`는 **원형** 나선 점이라 8각 변 중간에서 폴리라인 밖으로 나간다.
  //   코너만 쓰던 구판은 안 걸렸지만 단을 새기면 변 내부 점이 필요하다 → 변 안은 **선형 보간**.
  const atLen = (L) => {
    const Lc = Math.min(Math.max(L, 0), pathLen)
    let k = 0
    while (k < N_SEG - 1 && cum[k + 1] < Lc) k++
    const span = cum[k + 1] - cum[k]
    const t = span > 1e-9 ? (Lc - cum[k]) / span : 0
    const a0 = corners[k], b0 = corners[k + 1]
    return { k, t, x: a0[0] + (b0[0] - a0[0]) * t, z: a0[1] + (b0[1] - a0[1]) * t,
             yLin: ROOM_FLOOR_Y + CLIMB * ((k + t) / N_SEG) }
  }
  //  ★계단 파생 — 변당 정수 단(단높이 균일). 씨앗은 목표 단높이이고 **실제 값은 파생**이다.
  const segRise = CLIMB / N_SEG
  const nPerSeg = Math.max(1, Math.round(segRise / SPIRAL_RISE_SEED))
  const rise    = segRise / nPerSeg
  //  호길이 L에서 '밟는 면' 높이 — 변 k의 j번째 디딤(0-based)은 변 시작 + (j+1)·rise
  const yTread = (L) => {
    const a = atLen(L)
    const j = Math.min(nPerSeg - 1, Math.floor(a.t * nPerSeg))
    return ROOM_FLOOR_Y + CLIMB * (a.k / N_SEG) + (j + 1) * rise
  }
  //  밑면 — 'ramp' 경사 매스(★89 현행 어법) ↔ 'saw' 톱니(두께 균일)
  const ySoffit = (L) => (SPIRAL_SOFFIT === 'saw' ? yTread(L) : atLen(L).yLin) - SPIRAL_MASS_T

  return {
    N_SEG, SEG_ANG, TOTAL, CLIMB, yTopEnd, plateY,
    rAt, yAt, azAt, ptAt, corners, cum, pathLen, fAtLen, atLen,
    segRise, nPerSeg, rise, nSteps: nPerSeg * N_SEG, yTread, ySoffit,
    rHole, fHole, Lhole,
    W: ROOM_STAIR_WIDTH, T: SPIRAL_MASS_T, chamf: Math.min(SPIRAL_CHAMF, ROOM_STAIR_WIDTH / 2 - 0.05),
    slopeDeg: Math.atan2(CLIMB, pathLen) * 180 / Math.PI,
    segLen: Array.from({ length: N_SEG }, (_, k) => cum[k + 1] - cum[k]),
    treadMin: (cum[N_SEG] - cum[N_SEG - 1]) / nPerSeg,      // 끝 변(가장 짧다)의 디딤
    treadMax: (cum[1] - cum[0]) / nPerSeg,
  }
}

//  ★링 열 — 계단을 새기려면 변 내부에도 링이 필요하다. 각 단마다 **챌판 두 링 + 디딤 끝 한 링**.
//   ⚠챌판 위치의 두 링은 x·z가 같고 y만 다르다 → 그 사이 옆면이 챌판 면이 된다.
//   마이터(빗각)는 **코너에서만** 필요하다(변 내부는 방향이 안 바뀐다). 45° 꺾임 → 배율 1.082.
function norm2(x, z) { const L = Math.hypot(x, z) || 1; return [x / L, z / L] }

function stationList(s) {
  const dirOf = (k) => norm2(s.corners[k + 1][0] - s.corners[k][0], s.corners[k + 1][1] - s.corners[k][1])
  const nrm   = (d) => [-d[1], d[0]]
  const Ls = []
  if (SPIRAL_TREAD_ON) {
    for (let k = 0; k < s.N_SEG; k++) {
      for (let j = 0; j < s.nPerSeg; j++) {
        const L0 = s.cum[k] + (s.cum[k + 1] - s.cum[k]) * (j / s.nPerSeg)
        Ls.push({ L: L0, kind: 'riser0' })      // 챌판 아래(이전 디딤 높이)
        Ls.push({ L: L0, kind: 'riser1' })      // 챌판 위(이 디딤 높이)
      }
    }
    Ls.push({ L: s.pathLen, kind: 'end' })
  } else {
    for (let k = 0; k <= s.N_SEG; k++) Ls.push({ L: s.cum[k], kind: 'corner' })
  }
  const out = []
  for (let i = 0; i < Ls.length; i++) {
    const { L, kind } = Ls[i]
    const a = s.atLen(L)
    const kIn  = a.t < 1e-9 && a.k > 0 ? a.k - 1 : a.k          // 코너에서는 들어오는 변
    const kOut = Math.min(a.k, s.N_SEG - 1)
    const isCorner = (Math.abs(a.t) < 1e-9 || Math.abs(a.t - 1) < 1e-9)
    const d1 = dirOf(Math.min(kIn, s.N_SEG - 1)), d2 = dirOf(kOut)
    let m, scale
    if (isCorner && kIn !== kOut) {
      const n1 = nrm(d1), n2 = nrm(d2)
      m = norm2(n1[0] + n2[0], n1[1] + n2[1])
      const dot = m[0] * n1[0] + m[1] * n1[1]
      scale = Math.abs(dot) > 1e-6 ? 1 / dot : 1
    } else { m = nrm(d2); scale = 1 }
    //  높이: 챌판 아래 링은 '직전 디딤' 높이 = L에서 ε만큼 뒤의 밟는 면
    let yTop
    if (kind === 'riser0') yTop = L < 1e-9 ? ROOM_FLOOR_Y : s.yTread(L - 1e-6)
    else if (kind === 'end') yTop = s.yTopEnd
    else if (kind === 'corner') yTop = a.yLin
    else yTop = s.yTread(L + 1e-6)
    const yBot = SPIRAL_TREAD_ON ? Math.min(s.ySoffit(L - 1e-6), s.ySoffit(L + 1e-6)) : a.yLin - s.T
    out.push({ L, x: a.x, z: a.z, yTop, yBot, m, scale, t: d2 })
  }
  return out
}
// ══════════════════════════════════════════════════════════════
//  ① 나선 매스 — 속 찬 몸통 + 깎인 밑면(§2-D 2). 윗면 = 밟는 면.
// ══════════════════════════════════════════════════════════════
export function buildSpiralMass() {
  const g = new THREE.BufferGeometry()
  const s = spiralSpec(), P = [], Nn = []
  const st = stationList(s)
  const hwT = s.W / 2, hwB = s.W / 2 - s.chamf
  const ring = (a) => {
    const oT = hwT * a.scale, oB = hwB * a.scale
    return {
      LT: [a.x + a.m[0] * oT, a.yTop, a.z + a.m[1] * oT],
      RT: [a.x - a.m[0] * oT, a.yTop, a.z - a.m[1] * oT],
      LB: [a.x + a.m[0] * oB, a.yBot, a.z + a.m[1] * oB],
      RB: [a.x - a.m[0] * oB, a.yBot, a.z - a.m[1] * oB],
    }
  }
  const rs = st.map(ring)
  for (let i = 0; i + 1 < rs.length; i++) {
    const A = rs[i], B = rs[i + 1], a = st[i]
    const same = Math.abs(st[i + 1].L - a.L) < 1e-9           // 챌판(수평 이동 0)
    const outL = [a.m[0], 0, a.m[1]], outR = [-a.m[0], 0, -a.m[1]]
    //  챌판은 '앞을 보는 면' — 법선이 진행 방향의 반대(올라오는 사람이 마주 본다)
    //  챌판(수평 이동 0)에서는 밑면이 통째로 퇴화한다 — 안 낸다. 옆면은 삼각으로 살아남는다(퇴화 가드).
    const face = same ? [-a.t[0], 0, -a.t[1]] : [0, 1, 0]
    quadTo(P, Nn, A.LT, B.LT, B.RT, A.RT, face)               // 디딤(밟는 면) 또는 챌판(앞을 보는 면)
    if (!same) quadTo(P, Nn, A.LB, B.LB, B.RB, A.RB, [0, -1, 0])   // 밑면 — 올려다보는 얼굴
    quadTo(P, Nn, A.LT, B.LT, B.LB, A.LB, outL)               // 바깥 빗면(깎임)
    quadTo(P, Nn, A.RT, B.RT, B.RB, A.RB, outR)               // 안쪽 빗면(깎임)
  }
  const f0 = rs[0], fn = rs[rs.length - 1]
  const t0 = st[0].t, tn = st[st.length - 1].t
  quadTo(P, Nn, f0.LT, f0.RT, f0.RB, f0.LB, [-t0[0], 0, -t0[1]])   // 발치 마구리
  quadTo(P, Nn, fn.LT, fn.RT, fn.RB, fn.LB, [tn[0], 0, tn[1]])     // 도착 마구리
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(Nn, 3))
  return g
}

// ══════════════════════════════════════════════════════════════
//  ② 판 기둥 — 하부 37%. 판 위에 곧게 서고 코일 밑면을 받는다(§2-C: 곧음·고립·접지).
// ══════════════════════════════════════════════════════════════
export function columnSpec() {
  const s = spiralSpec()
  const out = []
  if (SPIRAL_SUP !== 'both' && SPIRAL_SUP !== 'slab') return out
  //  ★경계에서 **아래로** 센다 — 마지막 기둥이 경계에 붙고, 보와 같은 간격으로 맞물린다.
  for (let L = s.Lhole; L > 0; L -= SUP_COL_GAP) {
    const f = s.fAtLen(L)
    if (f > s.fHole) continue                      // 판이 없는 구간 = 기둥 불가(정의 권역 관통 금지)
    const a = s.atLen(L)
    const x = a.x, z = a.z
    const yTop = s.ySoffit(L)                      // 코일 밑면(계단 새김·밑면 어법 반영)
    const h = yTop - s.plateY
    if (h < SUP_COL_MIN) continue                  // 발치 근처는 높이가 0으로 수렴 — 안 세운다
    const r = Math.hypot(x, z)
    //  ★실측이 잡은 것(2026.08.03): 경로 중심이 fHole에 가까워지면 **기둥 발이 판 구멍 위로 넘친다**
    //   (마지막 기둥 r34.28 − 반경 1.0 = 33.28 < 입술 33.5 → 0.22 허공). 중심이 판 위라는 것과
    //   **발 전체가 판 위**라는 것은 다르다. 발 안쪽 끝으로 판정한다(★105 계열 — 경로를 실제로 딛는가).
    if (r - SUP_COL_R - SUP_COL_PAD < s.rHole) continue
    out.push({ f, L, x, z, r, az: Math.atan2(z, x), yBot: s.plateY, yTop, h })
  }
  out.sort((a, b) => a.L - b.L)
  return out
}

export function buildSpiralColumns() {
  const g = new THREE.BufferGeometry()
  const P = [], Nn = []
  const N = Math.max(3, SUP_COL_SIDES)
  for (const c of columnSpec()) {
    const R = SUP_COL_R
    const top = [], bot = []
    for (let i = 0; i < N; i++) {
      const a = c.az + (i + 0.5) * (Math.PI * 2 / N)
      top.push([c.x + R * Math.cos(a), c.yTop + SUP_COL_INSET, c.z + R * Math.sin(a)])
      bot.push([c.x + R * Math.cos(a), c.yBot,                 c.z + R * Math.sin(a)])
    }
    for (let i = 1; i + 1 < N; i++) {
      triTo(P, Nn, top[0], top[i], top[i + 1], [0, 1, 0])
      triTo(P, Nn, bot[0], bot[i], bot[i + 1], [0, -1, 0])
    }
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N
      const mx = (top[i][0] + top[j][0]) / 2 - c.x, mz = (top[i][2] + top[j][2]) / 2 - c.z
      const Lm = Math.hypot(mx, mz) || 1
      quadTo(P, Nn, top[i], top[j], bot[j], bot[i], [mx / Lm, 0, mz / Lm])
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(Nn, 3))
  return g
}

// ══════════════════════════════════════════════════════════════
//  ③ 벽 보 — 상부 63%. 코일 밑면에 붙어 셸 내면까지 뻗는다.
//   ★바깥 마구리는 **기울어진다**: 상반부 셸은 위로 갈수록 좁아지므로(wallR↓) 보 밑면 쪽이 더 멀리
//    나간다. 수직 마구리로 자르면 윗변이 셸을 뚫거나(외곽 위반) 밑변에 틈이 생긴다 — 사다리꼴이 정답.
// ══════════════════════════════════════════════════════════════
export function beamSpec() {
  const s = spiralSpec()
  const out = []
  if (SPIRAL_SUP !== 'both' && SPIRAL_SUP !== 'wall') return out
  //  ★★인계점 = **마지막 기둥이 선 자리**이지 판 구멍 경계가 아니다(2026.08.03 실측이 강제).
  //   경계 바로 앞 두 자리는 기둥 발이 구멍 위로 넘쳐 이미 걸러졌다 — 거기서 보로 넘기지 않으면
  //   이음매에 30짜리 공백이 남는다(실측 적발). 보는 **기둥이 끝난 곳**에서 이어받는다.
  const cols = columnSpec()
  const Lstart = cols.length ? cols[cols.length - 1].L + SUP_BEAM_GAP : s.Lhole
  for (let L = Lstart; L < s.pathLen; L += SUP_BEAM_GAP) {
    const f = s.fAtLen(L)
    if (f >= 1) break
    const a0 = s.atLen(L)
    const r  = Math.hypot(a0.x, a0.z), az = Math.atan2(a0.z, a0.x)
    const yT = s.ySoffit(L)                        // 보 윗면 = 코일 밑면
    const rIn  = r - s.W / 2                       // 안쪽 끝 = 코일 안쪽 모서리
    const rOutT = wallR(yT) - SUP_WALL_CLR
    const span  = rOutT - rIn
    if (!(span > SUP_BEAM_MIN)) continue           // 정상부 = 벽이 닫혀 스팬 소멸
    //  ★★보춤 자동 감쇠(2026.08.03 실측이 강제) — 정상부에서는 셸이 급히 닫혀 **flare가 span을
    //   압도한다**(고정 보춤 4일 때 f0.986: span 1.74 · flare 14.10 = 8:1 = 보가 아니라 지느러미).
    //   ⛔버리는 것은 오답이었다 — 버리면 상단 칸 130~141이 무지지로 남는다(실측 적발).
    //   정답은 **보춤을 깎는 것**이다: 스팬이 짧아지면 필요한 춤도 작아지므로 구조적으로도 옳다.
    //   d를 이분법으로 찾는다(닫힌 식 없음 — wallR이 √(1−u²)라 역해가 지저분하다).
    let d = SUP_BEAM_DEPTH
    if (wallR(yT - d) - wallR(yT) > span) {
      let lo = 0, hi = SUP_BEAM_DEPTH
      for (let it = 0; it < 40; it++) {
        const mid = (lo + hi) / 2
        if (wallR(yT - mid) - wallR(yT) > span) hi = mid; else lo = mid
      }
      d = lo
    }
    if (d < SUP_BEAM_DMIN) continue                // 그래도 못 세우면 포기(디스크가 끝을 받는다)
    const yB = yT - d
    const rOutB = wallR(yB) - SUP_WALL_CLR
    //  ★헌치 프로파일(★107-4) — 캔틸레버는 **뿌리에서 모멘트가 최대**다. 벽 쪽이 깊고 나선 쪽이 얕아야
    //   "실제로 받치고 있다"로 읽힌다. 전례 = ★92-d 헌치 · `PIER_JOIN_MODE='loft'`.
    //   t = 0(나선 끝) → 1(벽 뿌리). 깊이 = dEnd + (d − dEnd)·t^curve.
    const dEnd = d * SUP_BEAM_TAPER
    const depthAt = (t) => dEnd + (d - dEnd) * Math.pow(Math.min(1, Math.max(0, t)), SUP_BEAM_CURVE)
    const halfWAt = (t) => (SUP_BEAM_W / 2) * (SUP_BEAM_W_TAPER + (1 - SUP_BEAM_W_TAPER) * Math.min(1, Math.max(0, t)))
    out.push({ f, L, r, az, yT, yB, rIn, rOutT, rOutB, span, depth: d, dEnd,
               flare: rOutB - rOutT, depthAt, halfWAt })
  }
  return out
}

//  ★★보 종단 프로파일(★108-2, 2026.08.03 현도 지시) — 접합부 둘을 '다듬는다'.
//   반환 = 안쪽 코 → 벽 뿌리 순서의 점 열 {r(반경) · yb(밑면 높이) · hw(반폭)}.
//   ⚠검사·기하가 **같은 함수**를 쓴다(사본 금지 — `render_views` 발산 전례).
//
//   ⓐ **코 = 립 + 빗면**(현도 정정): 내 1차안은 춤을 0으로 수렴시키는 '흡수'였는데 현도가 막았다 —
//     *"저부분의 두께가 0이 되어서 상당히 어색할 것 같거든."* 맞다. 접선 수렴은 코를 **종잇장**으로
//     만든다(§2-D 3 두께 위계 위반). 정본 = **수직 립을 남기고 빗면으로 물러난다**. 립이 두께를 지키고
//     빗면이 절단면을 없앤다. §2-D 2 '깎인 밑면'과 같은 어휘다.
//   ⓑ **뿌리 스플레이**: 마지막 구간에서만 폭이 벌어진다(까치발 발). 전 구간 테이퍼와 다르다.
//   ⓒ **벽면 코브**: 셸은 수직이 아니라 dR/dy ≈ −0.69로 기운 면이다. 밑면 **끝 기울기를 벽면 기울기와
//     일치**시켜야 이음매가 사라진다 → 에르미트 보간(시작 기울기 = 헌치 곡선, 끝 기울기 = 벽면).
export function beamProfile(b, segs = SUP_BEAM_SEGS) {
  const pts = []
  const wMid = SUP_BEAM_W / 2
  const wNose = wMid * SUP_BEAM_W_NOSE
  const wRoot = wMid * SUP_BEAM_ROOT_GROW
  const rSpl = b.rIn + (b.rOutT - b.rIn) * SUP_BEAM_ROOT_SPLAY   // 스플레이·코브 시작 반경
  const rNose = Math.min(b.rIn + SUP_BEAM_NOSE_RUN, rSpl - 0.2)  // 코 빗면 끝
  const hwAt = (r) => {
    if (r <= rNose) return wNose + (wMid - wNose) * ((r - b.rIn) / Math.max(1e-9, rNose - b.rIn))
    if (r <= rSpl)  return wMid
    return wMid + (wRoot - wMid) * Math.pow((r - rSpl) / Math.max(1e-9, b.rOutT - rSpl), 1.6)
  }
  //  ⓐ 코 — 수직 립 하나, 그 다음 빗면 끝(§2-D 2 '깎인 밑면'과 같은 어휘)
  pts.push({ r: b.rIn, yb: b.yT - SUP_BEAM_NOSE_LIP, hw: hwAt(b.rIn) })
  pts.push({ r: rNose, yb: b.yT - b.dEnd,            hw: hwAt(rNose) })
  //  헌치 깊이를 **반경의 함수**로 — ⚠`rOutT` 밖으로도 연장된다(밑면은 상면보다 바깥까지 간다).
  const depthR = (r) => {
    const tt = (r - b.rIn) / Math.max(1e-9, b.rOutT - b.rIn)
    return b.dEnd + (b.depth - b.dEnd) * Math.pow(Math.max(0, tt), SUP_BEAM_CURVE)
  }
  const eps = 1e-3
  const wallSlope = (yy) => {                       // 벽면의 dy/dr (음수 — 아래로 갈수록 벌어진다)
    const dR = (wallR(yy + eps) - wallR(yy - eps)) / (2 * eps)
    return Math.abs(dR) < 1e-9 ? -50 : 1 / dR
  }
  //  ⓒ **필렛을 교점에서 역산한다.** ⛔각만 돌리고 벽까지 직진하면 깊이가 폭발한다(실측 23.76 —
  //   벽이 dy/dr ≈ −2.0라 남은 수평 거리의 2배로 떨어진다). 정석 = 두 접선의 **교점 P**를 찾고,
  //   양쪽으로 T = R·tan(Δ/2)만큼 물러난 두 점이 곧 접점이다. 그러면 깊이가 스스로 정해진다.
  let rP = b.rIn, yP = b.yT
  for (let i = 1; i <= 4000; i++) {                 // 헌치 곡선이 셸과 만나는 점 = P
    const r = b.rIn + (b.rOutT * 1.25 - b.rIn) * (i / 4000)
    const y = b.yT - depthR(r)
    if (r >= wallR(y) - SUP_WALL_CLR) { rP = r; yP = y; break }
    rP = r; yP = y
  }
  const th0 = Math.atan(-(depthR(rP + eps) - depthR(rP - eps)) / (2 * eps))
  const th1 = Math.atan(wallSlope(yP))
  const T = SUP_BEAM_FILLET * Math.tan(Math.abs(th1 - th0) / 2)
  const rA = Math.max(rNose + 0.1, rP - Math.cos(th0) * T)
  const yA = b.yT - depthR(rA)
  //  헌치 — 빗면 끝 → 필렛 접점 A
  const nH = Math.max(3, Math.round(segs * 0.6))
  for (let i = 1; i <= nH; i++) {
    const r = rNose + (rA - rNose) * (i / nH)
    pts.push({ r, yb: b.yT - depthR(r), hw: hwAt(r) })
  }
  //  필렛 원호 A → B — 방향각을 th0에서 th1로 돌린다. 각이 계속 아래를 향하므로 **단조 보장**.
  const nC = Math.max(4, Math.round(segs * 0.8))
  let rc = rA, yc = yA
  const ds = Math.abs(th1 - th0) * SUP_BEAM_FILLET / nC
  for (let i = 1; i <= nC; i++) {
    const th = th0 + (th1 - th0) * ((i - 0.5) / nC)
    rc += Math.cos(th) * ds
    yc += Math.sin(th) * ds
    pts.push({ r: rc, yb: yc, hw: hwAt(Math.min(rc, b.rOutT)) })
  }
  //  ⚠⚠**상면과 밑면의 반경이 다르다.** 코브가 밑면을 벽 아래쪽으로 밀어내는데(셸이 아래로 갈수록
  //   넓으니 당연하다), 상면까지 따라 나가면 **상면이 셸을 뚫는다**(실측 적발: 밑면 59.73 vs 상면 한계
  //   56.54). 상면은 `rOutT`에서 끊고 밑면만 내보낸다 → 뿌리 마구리가 기울어진 삼각형이 된다.
  for (const p of pts) {
    const lim = wallR(p.yb) - SUP_WALL_CLR
    if (p.r > lim) p.r = lim                       // 밑면: 그 높이의 셸까지
    p.rTop = Math.min(p.r, b.rOutT)                // 상면: 코일 밑면 높이의 셸까지
  }
  return pts
}

export function buildSpiralBeams() {
  const g = new THREE.BufferGeometry()
  const P = [], Nn = []
  for (const b of beamSpec()) {
    const cols = beamProfile(b)
    const p = (r, u, y) => fp(b.az, r, u, y)
    const t = [-Math.sin(b.az), 0, Math.cos(b.az)]
    for (let i = 0; i + 1 < cols.length; i++) {
      const A = cols[i], B = cols[i + 1]
      quadTo(P, Nn, p(A.rTop, -A.hw, b.yT), p(B.rTop, -B.hw, b.yT), p(B.rTop, B.hw, b.yT), p(A.rTop, A.hw, b.yT), [0, 1, 0])
      quadTo(P, Nn, p(A.r, -A.hw, A.yb), p(B.r, -B.hw, B.yb), p(B.r, B.hw, B.yb), p(A.r, A.hw, A.yb), [0, -1, 0])
      quadTo(P, Nn, p(A.rTop, -A.hw, b.yT), p(B.rTop, -B.hw, b.yT), p(B.r, -B.hw, B.yb), p(A.r, -A.hw, A.yb), [-t[0], 0, -t[2]])
      quadTo(P, Nn, p(A.rTop, A.hw, b.yT), p(B.rTop, B.hw, b.yT), p(B.r, B.hw, B.yb), p(A.r, A.hw, A.yb), t)
    }
    //  두 마구리 — 코는 **립 높이만큼만** 수직(빗면이 나머지를 먹었다) · 뿌리는 벽에 붙는다
    const F = cols[0], Lc = cols[cols.length - 1]
    quadTo(P, Nn, p(F.rTop, -F.hw, b.yT), p(F.rTop, F.hw, b.yT), p(F.r, F.hw, F.yb), p(F.r, -F.hw, F.yb), [-Math.cos(b.az), 0, -Math.sin(b.az)])
    quadTo(P, Nn, p(Lc.rTop, -Lc.hw, b.yT), p(Lc.rTop, Lc.hw, b.yT), p(Lc.r, Lc.hw, Lc.yb), p(Lc.r, -Lc.hw, Lc.yb), [Math.cos(b.az), 0, Math.sin(b.az)])
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(Nn, 3))
  return g
}

// ── 헤드룸 실측(검사·프로브 공용) — 보 밑면 ↔ 한 바퀴 아래 코일 윗면 ──
export function beamHeadroom() {
  const s = spiralSpec()
  let worst = Infinity, at = null
  for (const b of beamSpec()) {
    const fb = b.f - 1 / ROOM_STAIR_TURNS          // 한 바퀴 아래
    if (fb < 0) continue
    const rb = s.rAt(fb)
    if (!(rb > b.rIn && rb < b.rOutB)) continue    // 보 밑을 실제로 지나는 경우만
    //  ★헌치라 깊이가 반경마다 다르다 — **아래 코일이 실제로 지나는 그 반경의 깊이**로 잰다.
    //  ★코브까지 반영한 **실제 밑면**으로 잰다 — 프로파일에서 그 반경의 점을 찾는다.
    const prof = beamProfile(b)
    let yb = b.yT - b.depthAt(0)
    for (let i = 0; i + 1 < prof.length; i++) {
      if (rb >= prof[i].r && rb <= prof[i + 1].r) {
        const u = (rb - prof[i].r) / Math.max(1e-9, prof[i + 1].r - prof[i].r)
        yb = prof[i].yb + (prof[i + 1].yb - prof[i].yb) * u; break
      }
      if (rb > prof[prof.length - 1].r) yb = prof[prof.length - 1].yb
    }
    const gap = yb - (s.yAt(fb) + s.rise)      // 아래 코일의 '가장 높은 밟는 면'까지
    if (gap < worst) { worst = gap; at = { f: b.f, fb, gap } }
  }
  return { worst: Number.isFinite(worst) ? worst : null, at, need: SUP_HEAD_MIN }
}

// ── 무지지 스팬 실측(검사·프로브 공용) — 판·기둥·보·디스크를 전부 '받침'으로 보고 최대 공백을 잰다 ──
//  ⚠"보를 몇 개 놓았나"가 아니라 **"가장 긴 무지지 구간이 얼마인가"**가 진짜 수다(★105 계열).
export function unsupportedSpans() {
  const s = spiralSpec()
  const pts = [0]                                   // 발치 = 판에 앉는다
  for (const c of columnSpec()) pts.push(c.L)
  for (const b of beamSpec())   pts.push(b.L)
  pts.push(s.pathLen)                               // 도착 = 착지 디스크가 받는다
  pts.sort((a, b) => a - b)
  let worst = 0, at = 0
  for (let i = 0; i + 1 < pts.length; i++) {
    const g = pts[i + 1] - pts[i]
    if (g > worst) { worst = g; at = pts[i] }
  }
  return { worst, at, nSupports: pts.length - 2, ratio: worst / SPIRAL_MASS_T }
}

// ── 단 실측(검사 공용) — ★104-2 교훈: **공칭값이 아니라 밟는 면 사이 실제 점프**를 잰다 ──
export function treadProbe(N = 4000) {
  const s = spiralSpec()
  if (!SPIRAL_TREAD_ON) return null
  let prev = null, maxJump = 0, nJump = 0
  for (let i = 0; i <= N; i++) {
    const L = Math.min((i / N) * s.pathLen, s.pathLen - 1e-6)
    const y = s.yTread(L)
    if (prev === null) { prev = y; continue }
    if (y > prev + 1e-9) { maxJump = Math.max(maxJump, y - prev); nJump++; prev = y }
  }
  return {
    nSteps: s.nSteps, nPerSeg: s.nPerSeg, rise: s.rise,
    maxJump, nJumpDetected: nJump,
    treadMin: s.treadMin, treadMax: s.treadMax,
    blondel: [2 * s.rise + s.treadMin, 2 * s.rise + s.treadMax],
  }
}
