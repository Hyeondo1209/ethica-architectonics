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
