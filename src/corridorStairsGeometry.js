// corridorStairsGeometry.js — 통로 홀 1p5 순수 빌더
// (㊳ 07.14 곡선 다섯 → ㊴ 07.17~19 재설계 왕복 → ★㊴-7 2026.07.19 어휘 교체: 절곡/극좌표)
// ============================================================================
//  1p5 "동일한 본성·속성을 가지는 둘 이상의 실체는 존재할 수 없다"의 집.
//  다섯 리브(#−2~#+2)에 제각각 높이의 문, 깊은 제단(결절)에서 다섯 갈래 계단 — #0만 닿는다.
//
//  ★㊴-7 어휘 교체(현도 판정: 곡선 리본 두 스킴〔mirror·arc〕 모두 기각 — "둘 다 이상함"):
//   진단 = 연속 곡률 리본 자체가 비건축적(국수). 대가들의 문법(가르니에·봉 제수스·바오리·에피다우로스)은
//   전부 「곧은 비행(flight) + 참(landing)」 — 꺾임은 참에서만, 비행은 순수. 이에 어휘를 교체:
//
//   [A] 'flight' — 절곡 문법(봉 제수스·가르니에). 각 계단 = 현(S→문앞 참 P)을 등분한 지그재그
//       직선 비행들. 법칙 셋으로 전부 결정: 꺾임각 = 2·FLIGHT_ALPHA 균일 · 비행 등장(等長) ·
//       쌍 미러(±k는 지그재그 개시 부호가 거울 — a0 배치도 좌우 대칭 부채). 참 = 꺾임 지점의 넓은 판.
//   [B] 'polar' — 극좌표 문법(에피다우로스·계단우물·콜로세움). 상승은 전부 **드럼 벽에 붙은
//       동심 원호**(반경 POLAR_R 공유 = 동심이 기하로 보장)가 담당, 결절에서는 평탄한 **스포크
//       다리**가 곧게 뻗어 원호에 접속(정션 = 참). 반경 방향 = 시도(평탄), 원호 방향 = 오름.
//       중앙 공역은 비고 제단만 고립 — 긴 상승이 벽으로 흡수돼 밀도 문제를 함께 푼다.
//
//  공통 문법: 판 = 수평 부양 판 · 호길이 균일 재분배 · 참 구간은 판 대신 넓은 참 판 · 경사 ≤35°.
//  경로 = 폴리패스(직선·원호 조각 — CR 폐기: 첨점·되꺾임과의 싸움 자체를 어휘에서 제거).
//  순수 모듈: React 없음. Corridor(마운트)·Dome(문 CSG)·waypoints(계단 끝)·check(검증) 공유 정본.
// ============================================================================
import * as THREE from 'three'
import {
  MERIDIANS, SHELL_RIB_R, H, rOf,
  PLAT_X, PLAT_R, PLAT_Y, COR_THICK, COR_X1, COR_CX, COR_R, RIB_Y,
  DOOR_H,
  HALL_DOORS, STAIR_GAP, STAIR_DS, STAIR_W, STAIR_SCHEME,
  INCA_END_X, INCA_X0, INCA_TOP_Y, INCA_SLOPE, INCA_TD, INCA_W0, INCA_W1, INCA_BITE,
  INCA_CUT_Y, INCA_PANEL_L, INCA_PANEL_W, INCA_PANEL_T,
  INCA_ARCH_X0, INCA_ARCH_Y1, INCA_FACETS,
  R_BASE, INCA_NEXUS_R, INCA_TIP_Y1, INCA_TIP_Y2, INCA_GAP, INCA_TIP_T, INCA_EMBED,
  INTAKE_ON, INTAKE_FORM, INTAKE_CX, SLIT_W, SLIT_LEN_F, SLIT_N, SLIT_GAP, SLIT_R, SLIT_ARC_DEG, SLIT_ARC_MID,
  HALL_ENTRY, DESC_HW, DESC_SIDE, DESC_R, DESC_SWEEP, DESC_SWEEP_MIN, DESC_SWEEP_MAX, DESC_RISE_MAX,
  DESC_TAIL, DESC_ENTRY_AZ,   // ★㊾→51 하강로(접선화)
  PIER_ON, PIER_N, PIER_HW, PIER_DEPTH, PIER_OUT, DESC_PORT_ON, DESC_PORT_H, DESC_PORT_TOP, DESC_PORT_CLR,   // ★53
  BOX_X1, COR_Y0,
  ceilY, GAT_CX, GAT_CROWN_R, GAT_CONE_H, GAT_CROWN_H, GAT_SLIT, GAT_EAVE_MIN, GAT_EAVE_SF,
} from './constants.js'

export const PLAT_TOP = PLAT_Y + COR_THICK / 2   // 계단 출발면 = 깊은 제단 상면 ≈31.3
const DEG = Math.PI / 180
export const LAND_HALF = 1.1                     // 참 평탄 반길이(참 판 한 변 ≈ 2·LAND_HALF)

// ── 문 다섯 (기하 정본 — sill 표는 constants.HALL_DOORS) ──
export function hallDoors() {
  return HALL_DOORS.map(({ k, sill }) => {
    const phi = (k / MERIDIANS) * Math.PI * 2
    const rc = rOf((sill + DOOR_H / 2) / H)
    const cx = rc * Math.cos(phi), cz = rc * Math.sin(phi)
    const dl = Math.hypot(PLAT_X - cx, 0 - cz)
    const dhat = [(PLAT_X - cx) / dl, (0 - cz) / dl]
    return {
      k, sill, top: sill + DOOR_H, phi, cx, cz, dhat,
      wx: cx + dhat[0] * SHELL_RIB_R, wz: cz + dhat[1] * SHELL_RIB_R,
      reach: k === 0,
    }
  })
}

// ============================================================================
//  스킴 스펙 — 숫자는 최소한으로(법칙이 나머지를 결정)
// ============================================================================
export const FLIGHT_SPEC = {
  ALPHA: 40,   // ★㊵-4: 34.5→40 — 제단 83.5의 #-2 하강 74가 요구하는 경로 연장(꺾임 80° 균일 법칙 유지)                                 // 비행이 현에서 이탈하는 각(꺾임 = 69° 균일 — 봉 제수스 X 모티프. 경사 상한의 귀결)
  APPROACH: 6,                                 // 문 앞 정렬 비행 길이(마지막 참 P = E + dhat·6)
  a0: { '-2': -90, '-1': -45, '0': 0, '1': 45, '2': 90 },   // ★좌우 대칭 부채(등차 45°)
  FLIGHT_LEN: 26,                              // 목표 비행 길이 → nF = round(chord/26) — 24는 #+2가 참 4개로 climb 부족(실측 35.5°)
}
export const POLAR_SPEC = {
  R: 77.5,                                     // 원호 반경 — 다섯이 공유(동심의 증명). ⚠문 벽점 반경(78) 직전이어야 함:
                                               //  더 크면 원호 끝이 리브 관을 파고들고(81.4 실측), 문 진출이 순수 반경이 못 됨.
                                               //  벽 이격 6.5 = 창 구석 시야도 닫는다(벽 밀착 시절 −9 노출·동시 15 실측).
  //  감김(°): 경사 목표 ~25~33°의 귀결(rise/(sweep·R)) + 스포크 방위 이격 ≥15° 조정
  sweep: { '-2': 80, '-1': 78, '0': 58, '1': 40, '2': 82 },   // 경사≤35 + 스포크 방위 이격 ≥15°의 산물 (★㊵-4 제단 83.5: -2 하강 74.3 → 49→80 재도출·이격 -1과 17.3° 확보)
  STEP_OUT: 2.0,                               // reach #0: 원호 끝 → 리브 축 반경 진출
}

// ── 폴리패스: 조각(직선 line / 원호 arc) 배열 → 호길이 파라미터화 ──
function segLine(a, b) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return { t: 'l', a, b, L } }
function segArc(cx, cz, R, ph0, ph1) {         // ph 라디안, ph0→ph1(부호로 방향)
  return { t: 'a', cx, cz, R, ph0, ph1, L: Math.abs(ph1 - ph0) * R }
}
function pathLen(segs) { return segs.reduce((s, g) => s + g.L, 0) }
function pathAt(segs, s) {
  for (const g of segs) {
    if (s <= g.L + 1e-9) {
      const t = Math.max(0, Math.min(1, s / g.L))
      if (g.t === 'l') {
        const dx = g.b[0] - g.a[0], dz = g.b[1] - g.a[1], il = 1 / Math.max(1e-9, g.L)
        return { x: g.a[0] + dx * t, z: g.a[1] + dz * t, tx: dx * il, tz: dz * il }
      }
      const ph = g.ph0 + (g.ph1 - g.ph0) * t, sgn = Math.sign(g.ph1 - g.ph0)
      return { x: g.cx + g.R * Math.cos(ph), z: g.cz + g.R * Math.sin(ph),
               tx: -Math.sin(ph) * sgn, tz: Math.cos(ph) * sgn }
    }
    s -= g.L
  }
  const g = segs[segs.length - 1]
  return pathAt([g], g.L)
}

// 높이 모델: 노드 s·y 리스트(조각별 선형 — 참 평탄은 노드 쌍으로 표현)
function yAt(nodes, s) {
  if (s <= nodes[0][0]) return nodes[0][1]
  for (let i = 1; i < nodes.length; i++) {
    const [s0, y0] = nodes[i - 1], [s1, y1] = nodes[i]
    if (s <= s1) return y0 + (y1 - y0) * (s - s0) / Math.max(1e-9, s1 - s0)
  }
  return nodes[nodes.length - 1][1]
}

// ── 스킴별 경로 생성: { segs, landS: [참 중심 s], yNodes } ──
function buildFlightPath(d, S, E) {
  const { ALPHA, APPROACH, FLIGHT_LEN } = FLIGHT_SPEC
  const P = [E[0] + d.dhat[0] * APPROACH, E[1] + d.dhat[1] * APPROACH]
  const chord = [P[0] - S[0], P[1] - S[1]], cl = Math.hypot(...chord)
  const ca = [chord[0] / cl, chord[1] / cl], cn = [-ca[1], ca[0]]
  // ★등장(等長) 지그재그: 모든 비행이 현에서 정확히 ±ALPHA 이탈 → 수직 성분 상쇄를 위해 nF는 짝수.
  //  (구 '등분점±h' 방식은 중간 세그만 2h로 길어져 등장·균일 꺾임이 깨졌다 — 실측 반려)
  let nF = Math.max(2, Math.round(cl / FLIGHT_LEN))
  if (nF % 2 === 1) nF += (cl / nF > FLIGHT_LEN ? 1 : -1) || 1
  nF = Math.max(2, nF)
  const fl = cl / (nF * Math.cos(ALPHA * DEG))                 // 비행 길이(전부 동일)
  //  ★쌍 미러: ±k 개시 부호가 거울(바깥쪽 먼저). #0은 남측(−) 개시 — 대칭 부채 속 유일자의 서명이자
  //   #+1과의 초반 근접(선반 0.88 실측) 해소.
  const sign0 = d.k === 0 ? -1 : (d.k > 0 ? 1 : -1)
  const ct = Math.cos(ALPHA * DEG), st = Math.sin(ALPHA * DEG)
  const verts = [S]
  for (let i = 1; i <= nF; i++) {
    const sgn = sign0 * (i % 2 === 1 ? 1 : -1)
    const prev = verts[i - 1]
    verts.push([prev[0] + (ca[0] * ct + cn[0] * st * sgn) * fl,
                prev[1] + (ca[1] * ct + cn[1] * st * sgn) * fl])
  }
  verts[nF] = P                                                // 수치 오차 스냅
  verts.push(E)
  const segs = []
  for (let i = 1; i < verts.length; i++) segs.push(segLine(verts[i - 1], verts[i]))
  // 참 = 내부 꼭짓점 + P (S·E 제외)
  const landS = []
  let acc = 0
  for (let i = 0; i < segs.length - 1; i++) { acc += segs[i].L; landS.push(acc) }
  return { segs, landS }
}
function buildPolarPath(d, S, E) {
  const { R, sweep, STEP_OUT } = POLAR_SPEC
  const phD = Math.atan2(d.cz, d.cx - COR_CX)                  // 문 방위(드럼 중심 기준)
  const side = d.k > 0 ? 1 : -1                                // +k = 북에서 하강 접근 · −k/0 = 남에서 상승 접근
  const phS = phD + side * sweep[String(d.k)] * DEG
  const J = [COR_CX + R * Math.cos(phS), R * Math.sin(phS)]    // 정션(참)
  const segs = [segLine(S, J)]
  const landS = [segs[0].L]
  if (d.reach) {
    segs.push(segArc(COR_CX, 0, R, phS, phD))
    landS.push(segs[0].L + segs[1].L)                          // ★진출 꺾임(원호→반경)도 참이 덮는다
    segs.push(segLine([COR_CX + R * Math.cos(phD), R * Math.sin(phD)], [COR_X1, 0]))  // 반경 진출 → 리브 축
  } else {
    // ★비reach 종결 — 조건부 통일 규칙(간극 문법 = "문 벽점에서 6m"는 동일):
    //  문 벽점의 드럼 반경(80.6~88.5)이 문마다 달라서,
    //  · 반경차 < GAP(±1): 원호가 문 앞을 지나며 스스로 간극이 된다 → 벽점과의 거리 = GAP 되는
    //    각에서 원호 컷(코사인 법칙 역산). 극좌표의 실패 = 각도의 실패.
    //  · 반경차 ≥ GAP(±2): 원호 위 어디서도 6m 불가 → 문 방위 참에서 반경 스텁으로 꺾여 법선
    //    간극점 E에서 끊긴다. 극좌표의 실패 = 반경의 실패.
    const rw = Math.hypot(d.wx - COR_CX, d.wz), phw = Math.atan2(d.wz, d.wx - COR_CX)
    if (Math.abs(rw - R) < STAIR_GAP - 0.5) {
      const cosD = (R * R + rw * rw - STAIR_GAP * STAIR_GAP) / (2 * R * rw)
      const dPh = Math.acos(Math.min(1, Math.max(-1, cosD)))
      segs.push(segArc(COR_CX, 0, R, phS, phw + side * dPh))
    } else {
      segs.push(segArc(COR_CX, 0, R, phS, phD))
      landS.push(segs[0].L + segs[1].L)
      const A = [COR_CX + R * Math.cos(phD), R * Math.sin(phD)]
      segs.push(segLine(A, E))
    }
  }
  return { segs, landS }
}

// ── 빌드(스킴별 모듈 캐시) ──
const _cache = {}
export function buildHallStairs(scheme = STAIR_SCHEME) {
  return _cache[scheme] || (_cache[scheme] = _build(scheme))
}
function _build(scheme) {
  const doors = hallDoors()
  const stairs = []
  for (const d of doors) {
    // 출발: 플랫폼 림. flight = 대칭 부채 a0 / polar = 정션 방향(스포크가 결절에서 곧게 뻗는다)
    let S
    if (scheme === 'flight') {
      const a0 = FLIGHT_SPEC.a0[String(d.k)] * DEG
      S = [PLAT_X + (PLAT_R - 0.6) * Math.cos(a0), (PLAT_R - 0.6) * Math.sin(a0)]
    } else {
      const phD = Math.atan2(d.cz, d.cx - COR_CX)
      const side = d.k > 0 ? 1 : -1
      const phS = phD + side * POLAR_SPEC.sweep[String(d.k)] * DEG
      const J = [COR_CX + POLAR_SPEC.R * Math.cos(phS), POLAR_SPEC.R * Math.sin(phS)]
      const dj = Math.hypot(J[0] - PLAT_X, J[1]), u = [(J[0] - PLAT_X) / dj, J[1] / dj]
      S = [PLAT_X + u[0] * (PLAT_R - 0.6), u[1] * (PLAT_R - 0.6)]
    }
    //  ⚠간극점 회전 시도(±22°)는 폐기 — 간극점이 벽 원호상으로 이동해 판이 벽에 '접근', 창 구석
    //   노출이 −8→−9로 오히려 악화(실측). 법선 후퇴(원판)가 벽에서 가장 먼 간극이다.
    const E = d.reach ? [COR_X1, 0] : [d.wx + d.dhat[0] * STAIR_GAP, d.wz + d.dhat[1] * STAIR_GAP]
    const { segs, landS } = scheme === 'flight' ? buildFlightPath(d, S, E) : buildPolarPath(d, S, E)
    const L = pathLen(segs)
    const yS = PLAT_TOP, yE = d.reach ? RIB_Y : d.sill
    // 높이 모델: 평탄 구간들(참 ±LAND_HALF · polar 스포크 · ★끝 등고〔reach 7 = 문 앞 복도, 벽 통과 판이
    //  문턱과 등고 / 비reach 1.5 = 끝판이 문턱과 정확히 등고〕)을 빼고 남는 길이에 경사 균일 분배.
    const flats = []
    for (const ls of landS) flats.push([Math.max(0, ls - LAND_HALF), Math.min(L, ls + LAND_HALF)])
    if (scheme === 'polar') flats.unshift([0, segs[0].L - LAND_HALF])   // ★스포크 = 평탄 다리(반경 = 시도)
    flats.push([L - (d.reach ? (scheme === 'polar' ? 12 : 7) : 1.5), L])   // reach 등고 = 진출+원호 끝자락(polar 12 — 벽면 스침 판까지 문턱 등고, 실측)
    flats.sort((a, b) => a[0] - b[0])
    const merged = []
    for (const f of flats) {
      if (merged.length && f[0] <= merged[merged.length - 1][1] + 1e-6) {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], f[1])
      } else merged.push([...f])
    }
    const climbLen = L - merged.reduce((s, f) => s + (f[1] - f[0]), 0)
    const slope = (yE - yS) / Math.max(1e-9, climbLen)
    const yNodes = [[0, yS]]
    let cursor = 0, y = yS
    for (const [f0, f1] of merged) {
      if (f0 > cursor) { y += slope * (f0 - cursor); yNodes.push([f0, y]) }
      yNodes.push([f1, y]); cursor = f1
    }
    if (cursor < L) { y += slope * (L - cursor); yNodes.push([L, y]) }
    // 표본(검증용)
    const NS = Math.max(240, Math.ceil(L / 0.6))
    const samples = []
    for (let i = 0; i <= NS; i++) {
      const s = (i / NS) * L, p = pathAt(segs, s)
      samples.push({ x: p.x, z: p.z, y: yAt(yNodes, s), s, tx: p.tx, tz: p.tz })
    }
    // 판: 균일 재분배 · 참 구간(±LAND_HALF)은 스킵(참 판이 커버)
    const plates = []
    const N = Math.max(2, Math.round(L / STAIR_DS))
    const DS = L / N
    for (let i = 0; i < N; i++) {
      const s = (i + 0.5) * DS
      if (landS.some(ls => Math.abs(s - ls) < LAND_HALF)) continue
      const p = pathAt(segs, s)
      plates.push({ x: p.x, z: p.z, yTop: yAt(yNodes, s) + (s < 2 ? 0.02 : 0),
                    rotY: Math.atan2(-p.tz, p.tx), s })
    }
    // 참 판: 위치·이등분 방위
    const landings = landS.map(ls => {
      const pa = pathAt(segs, Math.max(0, ls - 0.8)), pb = pathAt(segs, Math.min(L, ls + 0.8))
      const p = pathAt(segs, ls)
      return { x: p.x, z: p.z, yTop: yAt(yNodes, ls),
               rotY: Math.atan2(-(pa.tz + pb.tz), pa.tx + pb.tx), s: ls }
    })
    const last = plates[plates.length - 1]
    stairs.push({
      k: d.k, reach: d.reach, L, plates, landings, samples, door: d,
      end: { x: last.x, y: last.yTop, z: last.z },
      yawToDoor: Math.atan2(-(d.wx - last.x), -(d.wz - last.z)),
    })
  }
  return { stairs, doors }
}

// ════════ ★★㊾→51 하강로 스펙(2026.07.23 접선화) — 박스 목(y101.3) → 잉카 판(y38.2) ════════
//  ㊾ 원판(직선+참)에서 현도 반려 2건: ① 참 블록 = "기하와 안 맞물리는 투박한 매듭" ② 대각 직선 = "별로".
//  ★51 해법 = 둘을 한 수로: **전 구간 접선 연속** — 꺾임이 없으면 참이 필요 없다.
//   'lateral' = [진입 직선] ⌒[필렛] ⌒[벽 동심호] ⌒[꼬리: 쌍원호 S(기본) | 구 직선] → 판.
//   'axial'   = [직선] 하나(불변 — 성격의 대비로 보존).
//  높이 = 균일 경사(참·평탄 전폐). ⚠단높이 천장: 디딤을 경사에서 역산(DESC_RISE_MAX — STEP_UP 0.8 보호).
const _tanEnd = (seg) => { const p = pathAt([seg], seg.L); return [p.tx, p.tz] }
function segArcDir(cx, cz, R, P0, P1, tStart) {     // 시작 접선이 tStart와 정합하는 회전 방향을 고르는 원호
  const ph0 = Math.atan2(P0[1] - cz, P0[0] - cx)
  const raw = Math.atan2(P1[1] - cz, P1[0] - cx)
  let best = null
  for (const c of [raw, raw + 2 * Math.PI, raw - 2 * Math.PI]) {
    if (Math.abs(c - ph0) < 1e-9) continue
    const g = Math.sign(c - ph0)
    const dot = (-Math.sin(ph0) * g) * tStart[0] + (Math.cos(ph0) * g) * tStart[1]
    if (dot > 0.5 && (best === null || Math.abs(c - ph0) < Math.abs(best - ph0))) best = c
  }
  return segArc(cx, cz, R, ph0, best === null ? raw : best)
}
function arcOrLineTo(P, t, Q) {                     // P에서 접선 t로 출발해 Q에 닿는 유일 원호(공선 퇴화 = 직선)
  const n = [-t[1], t[0]], d = [Q[0] - P[0], Q[1] - P[1]]
  const den = n[0] * d[0] + n[1] * d[1]
  if (Math.abs(den) < 1e-6) return segLine(P, Q)
  const sr = (d[0] * d[0] + d[1] * d[1]) / (2 * den)
  return segArcDir(P[0] + sr * n[0], P[1] + sr * n[1], Math.abs(sr), P, Q, t)
}
//  ★51 쌍원호(biarc): B(접선 tB) → E(접선 tE)를 원호 두 개로, 조인트 J에서 접선 연속.
//  등접선장 해 J(d) = ((B+d·tB)+(E−d·tE))/2 — d를 400점 스캔해 불연속 최소해(실측 <1e-6).
//  해석해 대신 수치 스캔인 이유: 부호·감김 case 분기가 D SIDE·sweep 조합마다 갈려 실수 온상 —
//  C2절이 표본 단위로 연속성·도착 정렬을 재검증하므로 스캔의 잔차는 그물에 걸린다.
function biarcTail(B, tB, E, tE) {
  let best = null
  const span = Math.hypot(E[0] - B[0], E[1] - B[1])
  for (let i = 1; i <= 400; i++) {
    const d = (i / 400) * span * 1.5
    const J = [(B[0] + d * tB[0] + E[0] - d * tE[0]) / 2, (B[1] + d * tB[1] + E[1] - d * tE[1]) / 2]
    const g1 = arcOrLineTo(B, tB, J)
    const g2r = arcOrLineTo(E, [-tE[0], -tE[1]], J)               // 역방향 구축(E→J)
    const t1 = _tanEnd(g1), t2r = _tanEnd(g2r)
    const miss = 1 + (t1[0] * t2r[0] + t1[1] * t2r[1])            // J에서 실제 진행 접선 = −(g2r 끝접선)
    if (best === null || miss < best.miss) best = { miss, g1, g2r }
  }
  const rev = g => g.t === 'l' ? segLine(g.b, g.a) : segArc(g.cx, g.cz, g.R, g.ph1, g.ph0)
  return [best.g1, rev(best.g2r)]
}
export function descentSpec(scheme = HALL_ENTRY) {
  const S = [BOX_X1, 0]                              // 출발 = 박스 출구(축상)
  const yS = COR_Y0 + COR_THICK / 2                  // 다리 상면과 등고
  const st = incaStairSpec()
  const E = [st.panel.x0, 0], yE = st.panel.yTop     // 도착 = 잉카 판 서단 상면
  const sweep = Math.max(DESC_SWEEP_MIN, Math.min(DESC_SWEEP_MAX, DESC_SWEEP)) * DEG
  let segs, viewS = null
  if (scheme === 'axial') {
    segs = [segLine(S, E)]
  } else {
    const side = DESC_SIDE >= 0 ? 1 : -1
    //  ① 진입 = 쌍원호(★51-2 재작성. 구 단일 접원 필렛은 회전 방향 불일치로 폐기 — 북행 궤도는
    //   시계 방향인데 동진(+x)→좌회전 접원은 반시계: 내접이 같은 회전을 요구해 263° 장회전 버그).
    //   쌍원호는 반시계→시계 두 호가 S로 반전을 흡수한다(꼬리와 동일 기계 — 구조의 대칭).
    const phA = Math.PI - side * (DESC_ENTRY_AZ * DEG)
    const A = [COR_CX + DESC_R * Math.cos(phA), DESC_R * Math.sin(phA)]
    const tA = [Math.sin(phA) * side, -Math.cos(phA) * side]   // 벽 호의 진행 접선(az가 sweep 쪽으로)
    const entry = biarcTail(S, [1, 0], A, tA)
    //  ② 벽 동심호: A(진입 합류점) → B(ph1 = 180° − side·sweep — sweep 의미는 서축 기준 유지)
    const ph1 = Math.PI - side * sweep
    const B = [COR_CX + DESC_R * Math.cos(ph1), DESC_R * Math.sin(ph1)]
    const wall = segArcDir(COR_CX, 0, DESC_R, A, B, tA)
    //  ③ 꼬리(★51 스위치)
    const tail = DESC_TAIL === 'chord' ? [segLine(B, E)] : biarcTail(B, _tanEnd(wall), E, [1, 0])
    segs = [...entry, wall, ...tail]
    viewS = entry.reduce((a, g) => a + g.L, 0) + wall.L / 2    // ★구도점 = 벽 호 중간('view' 소비)
  }
  const L = pathLen(segs)
  const yNodes = [[0, yS], [L, yE]]                  // 균일 경사(참·평탄 전폐 — ★51)
  const slope = (yE - yS) / L
  const ds = Math.min(STAIR_DS, DESC_RISE_MAX / Math.max(1e-6, Math.abs(slope)))
  const N = Math.max(2, Math.round(L / ds)), DS = L / N
  const plates = []
  for (let i = 0; i < N; i++) {
    const s = (i + 0.5) * DS, p = pathAt(segs, s)
    plates.push({ x: p.x, z: p.z, yTop: yAt(yNodes, s), rotY: Math.atan2(-p.tz, p.tx), s })
  }
  const NS = Math.max(240, Math.ceil(L / 0.6))
  const samples = []
  for (let i = 0; i <= NS; i++) {
    const s = (i / NS) * L, p = pathAt(segs, s)
    samples.push({ x: p.x, z: p.z, y: yAt(yNodes, s), s, tx: p.tx, tz: p.tz })
  }
  return { scheme, segs, landings: [], plates, samples, L, yS, yE, drop: yS - yE,
           slopeDeg: Math.atan(Math.abs(slope)) * 180 / Math.PI, ds: DS,
           rise: DS * Math.abs(slope), S, E, sweepDeg: sweep * 180 / Math.PI, viewS }
}

// ════════ ★53 피어 관문(2026.07.23) — "겹침을 지지로 승격"(현도) ════════
//  드럼 기어 피어의 방위 정본(구 Corridor.jsx DrumPiers 인라인 공식의 이관 — 렌더·검출·검증이 공유).
export function drumPierAzimuths() {
  const half = Math.floor(PIER_N / 2), innerOff = 20, outerOff = 180 - 43 - 12
  const out = []
  for (let k = 0; k < half; k++) {
    const off = half > 1 ? innerOff + (outerOff - innerOff) * (k / (half - 1)) : (innerOff + outerOff) / 2
    for (const sg of [-1, 1]) out.push((180 + sg * off) * DEG)
  }
  return out
}
//  하강로가 관통하는 피어 자동 검출: 방위 대역(피어 반폭 + 경로 반폭) ∩ 반경 대역(피어 안면 75 안쪽).
//  회전량·방향·반경을 돌리면 관문 목록이 따라 움직인다 — 수동 지정 금지(노브 안전).
export function descentPortSpec(scheme = HALL_ENTRY) {
  if (!PIER_ON || !DESC_PORT_ON || (scheme !== 'lateral' && scheme !== 'axial')) return []
  const d = descentSpec(scheme)
  const dyds = (d.yE - d.yS) / d.L
  const ports = []
  for (const az of drumPierAzimuths()) {
    let best = null
    for (const q of d.samples) {
      const r = Math.hypot(q.x - COR_CX, q.z)
      if (r + DESC_HW < COR_R - PIER_DEPTH) continue
      let da = Math.atan2(q.z, q.x - COR_CX) - az
      while (da > Math.PI) da -= 2 * Math.PI
      while (da < -Math.PI) da += 2 * Math.PI
      if (Math.abs(da) > Math.atan2(PIER_HW, COR_R) + Math.atan2(DESC_HW, r)) continue
      if (!best || Math.abs(da) < Math.abs(best.da)) best = { q, da }
    }
    if (best) ports.push({ az, s: best.q.s, x: best.q.x, z: best.q.z,
                           tx: best.q.tx, tz: best.q.tz, yWalk: best.q.y, dyds })
  }
  return ports
}
//  관문 프리즘(컷 브러시용 순수 삼각형) — 단면(횡 n × 종 v) 폴리곤을 경사 진행축으로 스윕한 닫힌 몸.
//   단면: 밑 = 보행선 −0.35(판 융착 통과) · 옆 = 안 −(HW+2.0)/밖 +(HW+CLR) · 위 = 아치(스케치) 또는 사각.
//   ⚠직선 스윕 근사: 경로는 피어 폭 ±7 안에서 곡선(최대 이탈 0.76〔R32.6 실측〕) — 옆 여유 2.0·1.8이 흡수.
//  ★53-2 공용: 닫힌 삼각 수프의 부호 부피(발산 정리 — 겉면 CCW이면 +V, 원점 무관) + 겉면 강제.
//   ⚠CSG는 겉면 법선 일관성을 전제한다. DrumPiers 원본 감김은 **안쪽**이었고(바깥면 법선이 +x 검산)
//   DoubleSide 재질이 그걸 가려왔다 — 렌더는 멀쩡했지만 CSG에 넣는 순간 껍데기·조각 파탄(현도 스크린샷).
export function signedVolume(pos) {
  let v = 0
  for (let i = 0; i < pos.length; i += 9) {
    const a = pos.slice(i, i + 3), b = pos.slice(i + 3, i + 6), c = pos.slice(i + 6, i + 9)
    v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6
  }
  return v
}
//  ⚠**전역 반전은 감김이 이미 일관될 때만 통한다.** 관문 프리즘은 옆면 26 / 캡 22가 서로 반대로
//   감겨 있어(혼재) 부호 부피 가드를 통과했는데도 CSG가 자재를 남겼다(현도 스크린샷 2차 — 개구부의
//   '얇은 판'). → **면마다 개별로** 중심 기준 바깥을 맞춘다. 피어 상자·관문 프리즘 둘 다 볼록이라
//   (볼록 단면 × 직선 스윕 = 볼록) 이 방법이 근사가 아니라 정확하다.
export function outwardTris(pos) {
  const n = pos.length / 3, c = [0, 0, 0]
  for (let i = 0; i < pos.length; i += 3) { c[0] += pos[i] / n; c[1] += pos[i + 1] / n; c[2] += pos[i + 2] / n }
  const out = []
  for (let i = 0; i < pos.length; i += 9) {
    const a = pos.slice(i, i + 3), b = pos.slice(i + 3, i + 6), d = pos.slice(i + 6, i + 9)
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]]
    const nr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const m = [(a[0] + b[0] + d[0]) / 3 - c[0], (a[1] + b[1] + d[1]) / 3 - c[1], (a[2] + b[2] + d[2]) / 3 - c[2]]
    if (nr[0] * m[0] + nr[1] * m[1] + nr[2] * m[2] < 0) out.push(...a, ...d, ...b)
    else out.push(...a, ...b, ...d)
  }
  return out
}
//  감김 일관성(방향 있는 변이 같은 방향으로 두 번 나오면 이웃 면이 반대로 감긴 것) — 검증이 쓴다.
export function windingConsistent(pos) {
  const k = (i) => pos.slice(i, i + 3).map(v => Math.round(v * 1e4)).join(',')
  const seen = new Set()
  for (let i = 0; i < pos.length; i += 9) {
    const v = [k(i), k(i + 3), k(i + 6)]
    for (let j = 0; j < 3; j++) {
      const e = v[j] + '>' + v[(j + 1) % 3]
      if (seen.has(e)) return false
      seen.add(e)
    }
  }
  return true
}
export function portPrismTris(port) {
  const nIn = -(DESC_HW + 2.0), nOut = DESC_HW + DESC_PORT_CLR
  const sec = [[nIn, -0.35], [nOut, -0.35]]
  if (DESC_PORT_TOP === 'flat') { sec.push([nOut, DESC_PORT_H], [nIn, DESC_PORT_H]) }
  else {
    const aR = (nOut - nIn) / 2, nc = (nIn + nOut) / 2, spring = DESC_PORT_H - aR
    sec.push([nOut, Math.max(0.5, spring)])
    for (let i = 1; i < 10; i++) { const a = (i / 10) * Math.PI
      sec.push([nc + aR * Math.cos(a), Math.max(0.5, spring) + aR * Math.sin(a)]) }
    sec.push([nIn, Math.max(0.5, spring)])
  }
  //  횡 단위벡터 = 수평 법선을 **바깥(반경) 방향으로 정렬**(도는 방향에 따라 부호가 뒤집힌다 — ★53 구속)
  const r = Math.hypot(port.x - COR_CX, port.z)
  const rd = [(port.x - COR_CX) / r, port.z / r]
  const N0 = [-port.tz, port.tx]
  const og = Math.sign(N0[0] * rd[0] + N0[1] * rd[1]) || 1
  const N = [N0[0] * og, N0[1] * og]
  const EL = PIER_HW + 3.5
  const ring = (u) => sec.map(([n, v]) => [
    port.x + u * port.tx + n * N[0], port.yWalk + u * port.dyds + v, port.z + u * port.tz + n * N[1]])
  const A = ring(-EL), B = ring(EL), pos = []
  const push = (a, b, c) => pos.push(...a, ...b, ...c)
  for (let i = 0; i < sec.length; i++) {
    const j = (i + 1) % sec.length
    push(A[i], B[i], B[j]); push(A[i], B[j], A[j])
  }
  for (let i = 1; i < sec.length - 1; i++) { push(A[0], A[i + 1], A[i]); push(B[0], B[i], B[i + 1]) }
  return outwardTris(pos)   // 감김 가드(㉚ 전례) — 공용 헬퍼로 이관(★53-2)
}

// ════════ ★잉카 계단 스펙(㊶-5→㊶-6) — 순수 수치 빌더(검증·렌더가 공유하는 정본) ════════
//  각 단 = 지면(-0.3)부터 자기 상면까지 꽉 찬 상자(잉카 매스 = 디딤 + 지지벽 한 몸).
//  단수 n = 디딤 목표(INCA_TD)로부터 반올림 → 실 rise·td는 '정상 정확 도달'로 재파생(균일).
//  ★㊶-6 절단: INCA_CUT_Y를 단 격자에 스냅(i0) → i0 아래 단 전부 제거. ★㊶-7 곡선 밑면: 접지 스트립
//  (절단면~ARCH_X0) 뒤 '위로 볼록' 다면 곡선(FACETS 분할 — 브루탈)이 리브 접점(ARCH_Y1)까지 상승 =
//  아치 보이드. 판(6배)의 밑면도 폭 전체 곡면(위로 볼록)이 서면 ROOT 높이로 흘러듦.
export function incaStairSpec() {
  const run = INCA_END_X - INCA_X0
  const n = Math.max(2, Math.round(INCA_TOP_Y / (INCA_TD * INCA_SLOPE)))
  const rise = INCA_TOP_Y / n, td = run / n
  const i0 = Math.min(n - 2, Math.max(0, Math.round(INCA_CUT_Y / rise)))   // 절단 스냅(최소 2단은 남김)
  const cutY = i0 * rise, cutX = INCA_X0 + i0 * td
  const wAt = (x) => INCA_W0 + (INCA_W1 - INCA_W0) * Math.min(1, Math.max(0, (x - INCA_X0) / run))
  const steps = []
  for (let i = i0; i < n; i++) {
    const x0 = INCA_X0 + i * td
    const x1 = i === n - 1 ? INCA_END_X + INCA_BITE : x0 + td   // 마지막 단만 리브 물림
    steps.push({ x0, x1, yTop: (i + 1) * rise, w0: wAt(x0), w1: wAt(x0 + td) })
  }
  // ★㊶-7 밑면 아치 다면(위로 볼록: sin — 급상승 후 완만): 발(ARCH_X0, 0) → 리브 접점(END+BITE, ARCH_Y1)
  const arch = []
  for (let f = 0; f <= INCA_FACETS; f++) {
    const t = f / INCA_FACETS
    arch.push({ x: INCA_ARCH_X0 + (INCA_END_X + INCA_BITE - INCA_ARCH_X0) * t,
                y: INCA_ARCH_Y1 * Math.sin(t * Math.PI / 2) })
  }
  // ★㊶-7→㊶-8 판: 서단 두께 T의 슬라브, 밑면 = 위로 볼록 곡면(1−cos — 완만 출발 후 급강하)이
  //  '바닥까지'(현도 ㊶-8) — 곡선 종점 = 절단면 발(지면 −0.3 매몰). 판 = 접지 곡면 콘솔.
  const px0 = cutX - INCA_PANEL_L
  const under = []
  for (let f = 0; f <= INCA_FACETS; f++) {
    const t = f / INCA_FACETS
    under.push({ x: px0 + (cutX - px0) * t,
                 y: (cutY - INCA_PANEL_T) - (cutY - INCA_PANEL_T + 0.3) * (1 - Math.cos(t * Math.PI / 2)) })
  }
  const panel = { x0: px0, x1: cutX + 0.2, yTop: cutY, t: INCA_PANEL_T, w: INCA_PANEL_W, under }
  return { n, rise, td, steps, x0: INCA_X0, x1: INCA_END_X, top: INCA_TOP_Y, run, i0, cutY, cutX, arch, panel }
}

// ════════ ★㊷ 다섯 날(2026.07.21 현도 스케치) — 반십각 넥서스 + #±1·±2 날 4 ════════
//  구성 원리(1p5 귀류의 완성):
//   · 넥서스 = 반십각 부채. 중심 ncx = 절단면 − INCA_NEXUS_R (파생) → 동변 = #0 절단면
//     = 현행 잉카 계단(incaStairSpec)이 무수정으로 중앙 변에서 출발. 서쪽 폐합 = 중심 지름(x=ncx).
//     다섯 변의 법선 = 리브 방위 스냅(현도 확정 — 리브 실방위 스팬 ±35.9° ≪ 정십각 180°).
//   · #0 = 기존 스펙 그대로(아치가 리브 접점 y65에서 멈춤·웨브 12·리브 물림) — 닿는 유일자.
//   · #±1·±2 = 같은 어휘(디딤·브루탈 다면·위로 볼록)이되 밑곡선이 '팁까지' — 칼끝 소멸.
//     팁 = 리브 면 INCA_GAP 앞 허공(부수 발견: #±2 리브가 벽 밖 4.0이라 팁이 드럼 벽면 84 직전
//     ≈83.1에서 멈춤 = '창턱까지 갔으나 넘지 못함'이 별도 조작 없이 나온다).
//  ⚠밑곡선 = 두께 프로파일 구성(교훈): 순수 sin(지면→팁)은 완만한 #±2(상승 6.8)에서 곡선이
//   디딤보다 빨리 올라 t≈0.9~0.95 구간을 위로 뚫는다(자가 교차 — 구현 전 검산으로 적발).
//   대신 밑곡선 = 상면 현(cutY→tipY 직선) − 두께(t), 두께(t) = TIP_T + (뿌리 전고 − TIP_T)·(1−sin(tπ/2))
//   → (상면 − 밑곡선) ≥ TIP_T가 전 구간 항등 보장 + y″<0 = 위로 볼록(S2 현-위 검사 어휘) 유지.
//  리브 하부 위치 = R_BASE 원(수직 구간 — INCA_END_X와 같은 기준).
export function incaBladesSpec() {
  const base = incaStairSpec()
  const ncx = base.cutX - INCA_NEXUS_R                        // 넥서스 중심(파생 — 동변 = 절단면)
  const blades = []
  for (const k of [-2, -1, 0, 1, 2]) {
    const phi = (k / MERIDIANS) * Math.PI * 2
    const rx = R_BASE * Math.cos(phi), rz = R_BASE * Math.sin(phi)
    const dx = rx - ncx, dz = rz, L = Math.hypot(dx, dz)
    const fx = rx - SHELL_RIB_R * dx / L, fz = rz - SHELL_RIB_R * dz / L   // 리브 내측면 점(넥서스 방향)
    const az = Math.atan2(fz, fx - ncx), faceDist = Math.hypot(fx - ncx, fz)
    if (k === 0) { blades.push({ k, az, faceDist, reach: true, ribC: [rx, rz] }); continue }
    const tipY = Math.abs(k) === 1 ? INCA_TIP_Y1 : INCA_TIP_Y2
    const s0 = INCA_NEXUS_R - INCA_EMBED, sTip = faceDist - INCA_GAP
    const nB = Math.max(2, Math.round((tipY - base.cutY) / base.rise))     // 단높이 = #0 rise 어휘 공유
    const rb = (tipY - base.cutY) / nB, tb = (sTip - s0) / nB
    const steps = []
    for (let i = 0; i < nB; i++)
      steps.push({ s0: s0 + i * tb, s1: s0 + (i + 1) * tb, yTop: base.cutY + (i + 1) * rb })
    const rootH = base.cutY + 0.3 - INCA_TIP_T                             // 뿌리 전고(상면 cutY ↔ 지면 −0.3)
    const under = []                                                       // 밑곡선(두께 프로파일 — 위 주석)
    for (let f = 0; f <= INCA_FACETS; f++) {
      const t = f / INCA_FACETS
      const top = base.cutY + (tipY - base.cutY) * t                       // 상면 현
      under.push({ s: s0 + (sTip - s0) * t, y: top - INCA_TIP_T - rootH * (1 - Math.sin(t * Math.PI / 2)) })
    }
    blades.push({ k, az, faceDist, reach: false, ribC: [rx, rz], tipY, s0, sTip, nB, rise: rb, tread: tb,
      steps, under,
      tip: { x: ncx + sTip * Math.cos(az), z: sTip * Math.sin(az) } })
  }
  // 넥서스 부채 폴리곤(x,z — 반시계): 서변 2점(x=ncx, 지름 폐합) + 림 6점(변 경계 방위, 반지름 +0.4 물림)
  const az5 = blades.map(b => b.az)                                        // 오름차순(−35.9°…+35.9°)
  const bnd = [az5[0] - (az5[1] - az5[0]) / 2]
  for (let i = 0; i < 4; i++) bnd.push((az5[i] + az5[i + 1]) / 2)
  bnd.push(az5[4] + (az5[4] - az5[3]) / 2)
  const rimR = INCA_NEXUS_R + 0.4                                          // 물림 0.4: 변 현이 날 서면·절단면을 덮음
  const nexus = [{ x: ncx, z: rimR * Math.sin(bnd[0]) }]
  for (const a of bnd) nexus.push({ x: ncx + rimR * Math.cos(a), z: rimR * Math.sin(a) })
  nexus.push({ x: ncx, z: rimR * Math.sin(bnd[5]) })
  return { ncx, blades, nexus, bnd, rimR, cutY: base.cutY }
}

// ════════ ★ 빛 흡입구 스펙(2026.07.22) — 천장 개구·챔버·검증의 공유 정본 ════════
//  순수 기술자(descriptor)만 반환. 슬릿형은 좁고 긴 개구 → 빛이 띠로 퍼진다.
//  조건 1(5갈래 계단서 외부 리브 불가시)은 형태와 무관하게 '챔버 + 뚜껑'이 위상으로 보장한다.
//   rect: {type:'rect', x0,x1,z0,z1}  ·  arc: {type:'arc', r0,r1,phi0,phi1, closed}
//  island = 'ring'에서 고리 안쪽에 남는 천장 섬(원판 — 안쪽 벽이 뚜껑에 매달아 지지).
export function intakeSpec() {
  const F = INTAKE_FORM
  if (!INTAKE_ON) return { form: 'off', holes: [], island: null }
  const cx = INTAKE_CX, MARGIN = 6
  const zmaxAt = (xa, xb) => {                       // 그 x띠에서 드럼 안에 들어가는 최대 |z|
    const d = Math.max(Math.abs(xa - COR_CX), Math.abs(xb - COR_CX))
    return Math.sqrt(Math.max(COR_R * COR_R - d * d, 1)) - MARGIN
  }
  const band = (xc) => {                             // 중심 xc의 직선 슬릿 하나
    const x0 = xc - SLIT_W / 2, x1 = xc + SLIT_W / 2
    const zh = zmaxAt(x0, x1) * SLIT_LEN_F
    return { type: 'rect', x0, x1, z0: -zh, z1: zh }
  }
  if (F === 'slit')  return { form: F, holes: [band(cx)], island: null }
  if (F === 'slits') {
    const holes = []
    for (let i = 0; i < SLIT_N; i++) holes.push(band(cx + (i - (SLIT_N - 1) / 2) * SLIT_GAP))
    return { form: F, holes, island: null }
  }
  if (F === 'arc' || F === 'ring') {
    const r0 = SLIT_R - SLIT_W / 2, r1 = SLIT_R + SLIT_W / 2
    if (F === 'ring') return { form: F, holes: [{ type: 'arc', r0, r1, phi0: 0, phi1: Math.PI * 2, closed: true }], island: { r: r0 } }
    const half = (SLIT_ARC_DEG * Math.PI / 180) / 2, mid = SLIT_ARC_MID * Math.PI / 180
    return { form: F, holes: [{ type: 'arc', r0, r1, phi0: mid - half, phi1: mid + half, closed: false }], island: null }
  }
  return { form: F, holes: [], island: null }        // 기구형(b1/b2/b3/funnel) = 기존 중앙 개구 경로
}
export const INTAKE_IS_SLIT = ['slit', 'slits', 'arc', 'ring'].includes(INTAKE_FORM)

// ════════ ★ 갓 봉인 수치해석(gatSeal — 2026.07.22) — 코드·검증 공유 정본 ════════
//  조건 1: 5갈래 계단 등 '실제 보행 지점'에서 크라운을 올려다본 시선이 반대편 링 슬릿으로 빠져
//  외부 리브를 보면 안 된다. 수평 리드(현도 ②)라 서쪽 틈이 벌어져 얕은 광선이 생기므로, 필요한
//  처마를 해석식이 아니라 표본 광선으로 직접 푼다(보행면 표본 × 방위 × 슬릿 높이).
//   광선 조건: (a) 위를 향함 (b) 크라운 밑동 개구(기울어진 원판)를 실제로 통과 (c) 슬릿에서 나감.
//   그 광선이 리드 높이에 도달하는 반경 = 그 광선을 막는 데 필요한 리드 반경. 최댓값이 답.
//  ⚠보행 표본이 늘면(새 계단 등) 요구 처마도 변한다 — 자동 파생이라 그때도 봉인이 유지된다.
export function gatSeal() {
  const cx = GAT_CX, R = GAT_CROWN_R
  const ringMaxY = ceilY(cx + R)                             // 크라운 링에서 가장 높은 지붕점(동쪽)
  // ★밑동·절단면·리드 전부 수평(현도 07.22 최종) → 크라운 = 완전한 수직 원통: 벽 높이·기둥 길이 균일,
  //  요구 처마 최소. 빗면 평행 안은 폐기(constants ⛔ 주석 — 쐐기 슬릿·접시 처마).
  const baseY = ringMaxY + GAT_CONE_H
  const cutY  = baseY + GAT_CROWN_H
  const lidY  = cutY + GAT_SLIT

  const W = []                                               // 보행면 표본(발 딛는 면) + 눈높이
  const bl = incaBladesSpec()
  W.push({ x: bl.ncx, z: 0, y: bl.cutY })
  for (const b of bl.blades) if (b.steps) for (const st of b.steps) {
    const sm = (st.s0 + st.s1) / 2
    W.push({ x: bl.ncx + sm * Math.cos(b.az), z: sm * Math.sin(b.az), y: st.yTop })
  }
  for (let i = 0; i <= 16; i++) {                            // #0 계단(제단 → 정상 77)
    const f = i / 16
    W.push({ x: bl.ncx + 30 + 30 * f, z: 0, y: bl.cutY + (INCA_TOP_Y - bl.cutY) * f })
  }
  for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {    // 드럼 바닥 격자
    const x = COR_CX + i * 12, z = j * 12
    if (Math.hypot(x - COR_CX, z) < COR_R - 4) W.push({ x, z, y: 0 })
  }

  const EYE_H = 1.6, AZ = 48, KH = 3
  let need = R
  for (const v of W) {
    const vy = v.y + EYE_H
    for (let i = 0; i < AZ; i++) {
      const t = (i / AZ) * Math.PI * 2
      const ex = cx + R * Math.cos(t), ez = R * Math.sin(t), y0 = cutY
      for (let k = 0; k <= KH; k++) {
        const yE = y0 + (lidY - y0) * (k / KH) * 0.999
        const dx = ex - v.x, dy = yE - vy, dz = ez - v.z
        if (dy <= 0.01) continue
        const sPar = (baseY - vy) / dy                       // 밑동 개구(수평 링)를 지나는가
        if (sPar <= 0 || sPar >= 1) continue
        if (Math.hypot(v.x + sPar * dx - cx, v.z + sPar * dz) >= R) continue
        const rise = lidY - yE
        if (rise <= 1e-6) continue
        const u = rise / dy
        need = Math.max(need, Math.hypot(ex + u * dx - cx, ez + u * dz))
      }
    }
  }
  const eave = Math.max(GAT_EAVE_MIN, (need - R) * GAT_EAVE_SF)
  return { baseY, cutY, lidY, eave, lidR: R + eave, needRaw: need - R }
}
