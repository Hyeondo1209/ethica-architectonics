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
  INCA_CENTER_MODE, INCA_SEP_MIN, INCA_RIM_CLR, INCA_CHAMF,   // ★94 넥서스 중심 정렬 체제 · ★94-b 판 챔퍼
  CUP_R, MAST_R, MAST_TOP_BITE, MAST_SEAT_BITE, MAST_SEG,   // ★94-c 중앙 기둥(mast)
  MAST_CAP, MAST_CAP_H, MAST_CAP_SEG, MAST_CAP_LAT, MAST_SKIRT,   // ★94-d 주두·뿌리 접합
  MAST_CAP_FORM, MAST_CAP_N, INCA_ARCH_Y0,   // ★94-e 코벨 주두 · ★94-g 솟는 평면
  NPIER_ON, NPIER_BITE, NPIER_SEAT, NPIER_LAT, NPIER_TAPER, NPIER_COLLAR,   // ★95 반십각 기둥 · ★97 테이퍼·칼라
  WBUT_ON, WBUT_ANG, WBUT_SEAT, WBUT_BITE, WBUT_LAT,   // ★98 서쪽 빗면 버트레스
  NHAUNCH_ON, NHAUNCH_ANG, NHAUNCH_BITE, NHAUNCH_SEAT, NHAUNCH_FAN, NHAUNCH_LAT, NHAUNCH_CORNER,   // ★96 사발 헌치
  INTAKE_ON, INTAKE_FORM, INTAKE_CX, SLIT_W, SLIT_LEN_F, SLIT_N, SLIT_GAP, SLIT_R, SLIT_ARC_DEG, SLIT_ARC_MID,
  HALL_ENTRY, DESC_HW, DESC_SIDE, DESC_R, DESC_SWEEP, DESC_SWEEP_MIN, DESC_SWEEP_MAX, DESC_RISE_MAX,
  BOX_HW,
  DESC_TAIL, DESC_ENTRY_AZ,   // ★㊾→51 하강로(접선화)
  PIER_ON, PIER_N, PIER_HW, PIER_DEPTH, PIER_OUT, DESC_PORT_ON, DESC_PORT_H, DESC_PORT_TOP, DESC_PORT_CLR,   // ★53
  BOX_X1, COR_Y0,
  WOLDAE_ON, WOLDAE_OUT, WOLDAE_HW, WOLDAE_TIP_T, WOLDAE_ROOT_D, WOLDAE_FACETS, WOLDAE_EMBED, WOLDAE_RIM,   // ★54 월대
  WOLDAE_NOTCH, WOLDAE_NOTCH_R,   // ★54-2 노치
  WOLDAE_RISE, WOLDAE_RISE_H, WOLDAE_RISE_HW, WOLDAE_STEP_R, WOLDAE_STEP_T,   // ★54-3 상승단
  ceilY, GAT_CX, GAT_CROWN_R, GAT_CONE_H, GAT_CROWN_H, GAT_SLIT, GAT_EAVE_MIN, GAT_EAVE_SF, gatCap,
  FRIEZE_ROOM_ON, FR_FLOOR_Y, FR_CEIL_T, TEMPLE_CLR,                                          // ★55 프리즈 방
  RIB_CUT_ON, RIB_CUT_MODE, RIB_CUT_SEED, RIB_CUT_GAP_MIN, RIB_CUT_HEAD,                       // ★56 리브 절단(1p7)
  RIB_CUT_STUB_MIN, RIB_CUT_SEP, RIB_CUT_CAP_T, RIB_CUT_CAP_MG,
  FR_WIN_ON, FR_WIN_SILL, FR_WIN_HEAD, FR_WIN_BAR_ON, FR_WIN_BAR_ALIGN,                        // ★77 서벽 창
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
// ════════ ★54 월대(月臺) — 박스 목의 전경 단(2026.07.24 · 현도 제안·명명 · 확정 4항) ════════
//  ⓐ이름 = 월대 / ⓑ뿌리 = 벽 코벨 / ⓒ위상 = 길 위 / ⓓ비례·난간 = Claude(근거 = constants 주석).
//  형상 = **한 덩어리 코벨 매스**의 x–y 단면을 z로 압출한다. 낱개 까치발 여럿은 금지 —
//   가늘고 반복되는 세로 부재는 열주로 읽혀 리브 어휘를 오염시킨다(§2-C · 52 피어 반려 전례).
//   상면 평평(yTop) → 동단 수직면(TIP_T) → **밑면 = 위로 볼록한 다면 곡선** → 벽 안쪽 뿌리(ROOT_D).
//  ⚠밑곡선은 ㊷에서 검산으로 확정된 **두께 프로파일 구성**을 그대로 재사용한다(순수 sin은 완만한 구간에서
//   자가 교차한다는 교훈 — 여기서도 같은 함정이 있다):
//     thick(u) = TIP_T + (ROOT_D − TIP_T)·(1 − sin(u·π/2)),  u = 0(뿌리) → 1(팁)
//   thick이 u에 대해 볼록 ⇒ 밑면(yTop − thick)이 오목 ⇒ **위로 볼록**이 항등으로 보장되고,
//   최소 두께 ≥ TIP_T도 자동. 다면(FACETS) 분할 = 잉카 아치 보이드의 브루탈 어휘 계승(§2-D ④).
//  ⚠평면은 직사각이 아니라 **사다리꼴**이다(구현 중 실측이 강제): 반폭을 10 균일로 두면 뿌리 모서리가
//   (x119, z±10)에 서는데 그 방위의 드럼 벽은 x≈120.6이라 **벽 밖으로 1.6 삐져나온다**(벽 = 두께 0 셸).
//   뿌리 반폭을 박스 반폭(BOX_HW=6)으로 잠그면 뿌리 전체가 박스 몸통 안에 묻혀 노출이 0이 되고,
//   덤으로 '입에서 나오며 벌어지는' 형상 = 아래 다섯 날 부채와 같은 몸짓이 된다. 뿌리 반폭은 노브가
//   아니라 **파생**이다(박스 입과 어긋나면 안 되므로).
export function woldaeSpec() {
  const yTop = COR_Y0 + COR_THICK / 2            // 박스 바닥·하강로 출발면과 등고(무단차 — 한 레벨)
  const x0 = BOX_X1 - WOLDAE_EMBED               // 벽 안쪽으로 물림 = 절단면 은닉(§2-D ③)
  const x1 = BOX_X1 + WOLDAE_OUT                 // 동단(조망 끝)
  const hwRoot = BOX_HW, hwTip = WOLDAE_HW
  const st = []                                  // 단면 정거장(뿌리 → 팁): x · 밑면 y · 반폭
  for (let i = 0; i <= WOLDAE_FACETS; i++) {
    const u = i / WOLDAE_FACETS
    const thick = WOLDAE_TIP_T + (WOLDAE_ROOT_D - WOLDAE_TIP_T) * (1 - Math.sin(u * Math.PI / 2))
    st.push({ u, x: x0 + (x1 - x0) * u, y: yTop - thick, t: thick, hw: hwRoot + (hwTip - hwRoot) * u })
  }
  const hwAt = (x) => {                          // 임의 x의 반폭(사다리꼴 선형 — 노치 무시한 외곽)
    const u = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)))
    return hwRoot + (hwTip - hwRoot) * u
  }
  const underY = (x) => {                        // 임의 x의 밑면 y(두께 프로파일)
    const u = Math.max(0, Math.min(1, (x - x0) / (x1 - x0)))
    return yTop - (WOLDAE_TIP_T + (WOLDAE_ROOT_D - WOLDAE_TIP_T) * (1 - Math.sin(u * Math.PI / 2)))
  }
  //  ── ★54-2 노치(동단을 갉는다) — +z에서 −z로 가는 폴리라인. 살(팁반폭 − R) ≥ 2를 클램프로 강제 ──
  const R = Math.max(0, Math.min(WOLDAE_NOTCH_R, hwTip - 2))
  const notch = (WOLDAE_NOTCH === 'off' || R <= 0) ? null : (() => {
    const P = []
    if (WOLDAE_NOTCH === 'semi') {               // 반원 — 매끈한 품
      const N = 14
      for (let i = 0; i <= N; i++) { const t = (90 + 180 * (i / N)) * DEG; P.push({ x: x1 + R * Math.cos(t), z: R * Math.sin(t) }) }
    } else if (WOLDAE_NOTCH === 'deca') {        // 반십각 — 넥서스와 같은 도형(정십각 절반 = 변 5)
      for (let i = 0; i <= 5; i++) { const t = (90 + 36 * i) * DEG; P.push({ x: x1 + R * Math.cos(t), z: R * Math.sin(t) }) }
    } else {                                     // 'wedge' 사다리꼴 — 안쪽에 마주 설 평면이 생긴다
      P.push({ x: x1, z: R }, { x: x1 - R, z: R * 0.45 }, { x: x1 - R, z: -R * 0.45 }, { x: x1, z: -R })
    }
    return P
  })()
  //  ── 평면 윤곽(+z 변 → 동단·노치 → −z 변 → 뿌리) : 상·하면 삼각분할과 옆면·립이 전부 이걸 쓴다 ──
  const contour = []
  for (const p of st) contour.push({ x: p.x, z: p.hw })            // +z 변(뿌리 → 팁)
  const eastFrom = contour.length - 1                              // 립이 따라갈 구간의 시작 인덱스
  if (notch) for (const p of notch) contour.push({ x: p.x, z: p.z })
  const eastTo = contour.length                                    // (노치 없으면 동단 직선 한 변)
  for (let i = st.length - 1; i >= 0; i--) contour.push({ x: st[i].x, z: -st[i].hw })   // −z 변(팁 → 뿌리)
  //  점-다각형(윤곽 정본) — 노치를 판 만큼 발자국에서도 빠진다
  const inside = (x, z) => {
    let c = false
    for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
      const a = contour[i], b = contour[j]
      if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) c = !c
    }
    return c
  }
  //  ── ★54-3 상승단 — 월대 위에 얹는 단(2단 월대 = 상월대가 하월대 위에 얹히는 그 구성) ──
  //   ⚠유효폭은 안 는다('front'·'all'은 가장자리가 눈과 함께 올라가므로) — 이건 **사건**을 만드는 장치다.
  const notchBotX = notch ? x1 - (x1 - Math.min(...notch.map(p => p.x))) : x1
  let rise = null
  if (WOLDAE_RISE !== 'off' && WOLDAE_RISE_H > 0) {
    const H = WOLDAE_RISE_H
    const n = Math.max(2, Math.round(H / WOLDAE_STEP_R))     // 단 수 — 단높이는 H/n으로 균등 배분
    const stepH = H / n, run = WOLDAE_STEP_T, stairRun = n * run
    let podEast, podW, podDepth
    if (WOLDAE_RISE === 'all') { podEast = x1; podW = Infinity; podDepth = x1 - (BOX_X1 + stairRun) }
    else if (WOLDAE_RISE === 'back') { podEast = notchBotX - Math.max(2, H * 0.8); podW = WOLDAE_RISE_HW; podDepth = 3 }
    else { podEast = notchBotX; podW = WOLDAE_RISE_HW; podDepth = 3 }   // 'front' — 단 앞이 바로 허공
    const podWest = podEast - podDepth, stairW = podWest - stairRun
    rise = { form: WOLDAE_RISE, H, n, stepH, run, stairRun, podEast, podWest, podDepth, podW, stairW,
             top: yTop + H, fits: stairW >= BOX_X1 - 1e-9, notchBotX }
  }
  //  ★보행면 정본 — 계단·단·기본 상면을 한 함수로. 웨이포인트·하강로·검증이 전부 이걸 쓴다.
  const surfY = (x, z) => {
    if (!rise) return yTop
    if (Math.abs(z) > rise.podW) return yTop
    if (x >= rise.podWest) return rise.top
    if (x <= rise.stairW) return yTop
    return yTop + rise.stepH * Math.min(rise.n, Math.ceil((x - rise.stairW) / rise.run))
  }
  return {
    on: WOLDAE_ON, x0, x1, yTop, stations: st, under: st, inside, hwAt, underY,
    rise, surfY, notchBotX,
    hwRoot, hwTip, hw: hwTip, contour, eastFrom, eastTo,
    notch, notchForm: notch ? WOLDAE_NOTCH : 'off', notchR: notch ? R : 0,
    notchDeep: notch ? x1 - Math.min(...notch.map(p => p.x)) : 0,
    tipT: WOLDAE_TIP_T, rootD: WOLDAE_ROOT_D, facets: WOLDAE_FACETS,
    rim: WOLDAE_RIM, rimTop: yTop + WOLDAE_RIM,
  }
}

export function descentSpec(scheme = HALL_ENTRY) {
  const S = [BOX_X1, 0]                              // 출발 = 박스 출구(축상)
  const yS = COR_Y0 + COR_THICK / 2                  // 다리 상면과 등고
  const st = incaStairSpec()
  //  ★★94 도착 = **그 높이에서 서쪽으로 가장 먼저 나오는 단단한 면**.
  //   'off'/'cut'에선 그게 진입 판 서단이다. ⚠'fan'에선 넥서스 부채가 판보다 서쪽(ncx)까지 뻗으므로
  //    판 서단을 쓰면 하강로 마지막 구간이 **부채 위를 지나 보(2.6)가 부채 솔리드를 파고든다**
  //    (check_waypoints [47]이 실측 0.24로 적발 — 체제를 껐다 켜며 잡힌 실제 충돌이다).
  //   그래서 min으로 파생시킨다: 부채가 판을 삼키면 도착도 부채 서변으로 당겨진다.
  const arriveX = Math.min(st.panel.x0, incaNexusWestX())
  const E = [arriveX, 0], yE = st.panel.yTop        // 도착 = 판 서단 또는 넥서스 서변(파생)
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
  //  ★54 월대: **평면 기하는 손대지 않는다**(관문 자동검출·벽 여유·다섯 날 거리·접선 연속 전부 불변).
  //   바뀌는 건 수직 프로파일뿐 — 월대 발자국 안에서 y가 평탄(월대 상면)하다가 발자국을 나가는 s에서
  //   균일 경사로 꺾인다. ⚠참(landing)의 부활이 아니다: landings는 그대로 0이고(C2 '참 0' 유지)
  //   경로 *중간*엔 평탄이 없다. 이건 §2-D ③의 **출발 문지방**이며 평탄은 오직 s=0 구간에만 허용된다.
  //   ⚠실측: 경로는 동단이 아니라 **북변(z=+HW)**으로 빠져나간다 → 동쪽 돌출은 순수 조망분.
  const wd = woldaeSpec()
  let sFlat = 0
  if (wd.on) {
    const STEP = 0.25
    while (sFlat + STEP <= L && wd.inside(pathAt(segs, sFlat + STEP).x, pathAt(segs, sFlat + STEP).z))
      sFlat += STEP
  }
  //  ★54-3: 하강은 **월대의 실제 보행면 높이에서** 시작한다('all'이면 오른 레벨 = ⓒ'길 위' 유지).
  //   yS(박스 바닥)는 그대로 두고 ySurf를 따로 둔다 — 기존 출발 검사들이 yS를 보기 때문.
  const exitP = sFlat > 0 ? pathAt(segs, sFlat) : pathAt(segs, 0)
  const ySurf = wd.on ? wd.surfY(exitP.x, exitP.z) : yS
  const yNodes = sFlat > 0 ? [[0, ySurf], [sFlat, ySurf], [L, yE]] : [[0, ySurf], [L, yE]]
  const slope = (yE - ySurf) / Math.max(1e-6, L - sFlat)
  const ds = Math.min(STAIR_DS, DESC_RISE_MAX / Math.max(1e-6, Math.abs(slope)))
  const N = Math.max(2, Math.round(L / ds)), DS = L / N
  const plates = []
  for (let i = 0; i < N; i++) {
    const s = (i + 0.5) * DS, p = pathAt(segs, s)
    //  ★54 onWoldae = 월대 상면이 이미 걷는 면인 구간 → 렌더러가 판을 생략한다(판을 얹으면 코플레이너)
    plates.push({ x: p.x, z: p.z, yTop: yAt(yNodes, s), rotY: Math.atan2(-p.tz, p.tx), s,
                  onWoldae: wd.on && wd.inside(p.x, p.z) })
  }
  const NS = Math.max(240, Math.ceil(L / 0.6))
  const samples = []
  for (let i = 0; i <= NS; i++) {
    const s = (i / NS) * L, p = pathAt(segs, s)
    samples.push({ x: p.x, z: p.z, y: yAt(yNodes, s), s, tx: p.tx, tz: p.tz })
  }
  return { scheme, segs, landings: [], plates, samples, L, yS, ySurf, yE, drop: ySurf - yE,
           slopeDeg: Math.atan(Math.abs(slope)) * 180 / Math.PI, ds: DS,
           rise: DS * Math.abs(slope), S, E, sweepDeg: sweep * 180 / Math.PI, viewS,
           sFlat, woldae: wd }
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
//  ★★94 계단 격자 — 절단 역산('cut')이 이 격자 위에서 이뤄지므로 순수 함수로 분리한다.
export function stairGrid() {
  const run = INCA_END_X - INCA_X0
  const n = Math.max(2, Math.round(INCA_TOP_Y / (INCA_TD * INCA_SLOPE)))
  return { run, n, rise: INCA_TOP_Y / n, td: run / n }
}

//  ★★94 주어진 넥서스 중심에서 본 다섯 리브의 방위 — **순환 없는 순수 함수**.
//   'cut' 체제의 R 역산이 이걸 쓴다(중심은 축에 고정이므로 R과 무관하게 방위가 결정된다).
export function bladeAzAt(ncx) {
  const out = []
  for (const k of [-2, -1, 0, 1, 2]) {
    const phi = (k / MERIDIANS) * Math.PI * 2
    const rx = R_BASE * Math.cos(phi), rz = R_BASE * Math.sin(phi)
    const dx = rx - ncx, dz = rz, L = Math.hypot(dx, dz)
    const fx = rx - SHELL_RIB_R * dx / L, fz = rz - SHELL_RIB_R * dz / L
    out.push(Math.atan2(fz, fx - ncx))
  }
  return out
}

//  ★★94 넥서스 반지름 — **세 체제 전부 파생**(constants INCA_CENTER_MODE 주석이 근거 정본).
//   'off' = 노브 그대로 · 'cut' = 날-날 간격 요구에서 역산(축 고정이라 R과 무순환)
//   'fan' = 절단면 − 드럼축(서변이 축에 닿는다)
export function nexusR() {
  if (INCA_CENTER_MODE === 'fan') {
    const { td } = stairGrid()
    return (INCA_X0 + cutStep('fan') * td) - COR_CX
  }
  if (INCA_CENTER_MODE === 'cut' || INCA_CENTER_MODE === 'mast') {   // ★94-c mast = cut 정렬 위에 기둥
    const az = bladeAzAt(COR_CX)                       // 중심 = 축(스냅 오차는 0.2 이하 — 검사가 잰다)
    let need = INCA_NEXUS_R
    for (let i = 0; i < 4; i++)
      need = Math.max(need, (INCA_W0 + INCA_SEP_MIN) / Math.sin(az[i + 1] - az[i]) - 1.5)
    return need
  }
  return INCA_NEXUS_R
}

//  ★★94 절단 단 i0 — 'cut'이면 **목표 절단면(축 + R)에서 역산**, 아니면 INCA_CUT_Y에서.
export function cutStep(mode = INCA_CENTER_MODE) {
  const { n, rise, td } = stairGrid()
  const raw = mode === 'cut' || mode === 'mast'
    ? (COR_CX + nexusR() - INCA_X0) / td               // 넥서스 중심 = 드럼축이 되는 단
    : INCA_CUT_Y / rise
  return Math.min(n - 2, Math.max(0, Math.round(raw)))
}

export function incaStairSpec() {
  const { run, n, rise, td } = stairGrid()
  const i0 = cutStep()                                                    // ★94 체제별 파생(구: CUT_Y 스냅 고정)
  const cutY = i0 * rise, cutX = INCA_X0 + i0 * td
  const wAt = (x) => INCA_W0 + (INCA_W1 - INCA_W0) * Math.min(1, Math.max(0, (x - INCA_X0) / run))
  const steps = []
  for (let i = i0; i < n; i++) {
    const x0 = INCA_X0 + i * td
    const x1 = i === n - 1 ? INCA_END_X + INCA_BITE : x0 + td   // 마지막 단만 리브 물림
    steps.push({ x0, x1, yTop: (i + 1) * rise, w0: wAt(x0), w1: wAt(x0 + td) })
  }
  // ★㊶-7 밑면 아치 다면(위로 볼록: sin — 급상승 후 완만): 발(ARCH_X0, 0) → 리브 접점(END+BITE, ARCH_Y1)
  //  ★★★94-e 현도 "5갈래 아래 지지하는 부분과 원기둥이 접하지도 않는다" — 실측 원인:
  //   매스 밑이 **y −0.3 고정**이라 서면이 전고 31.2 수직 벽으로 매달리고 접지 스트립(x 216~240)이
  //   전부 허공이었다(주두 상단에서 아래로 29.71 무지지). 지면이 ★87로 없어진 자리의 유물.
  //   → 'mast'+'slab'에선 매스 밑 = **슬라브 밑면**, 아치도 거기서 솟는다 → 판·넥서스·날과 한 장.
  //   ⚠아치의 일("리브 밑동을 자유롭게")은 그대로다 — 접점 ARCH_Y1은 안 건드린다.
  //  ★★94-g 'mast': 매스 밑 = **솟는 평면**(구 −0.3 = 지면 매몰의 유물). 아치 자체는 무수정 —
  //   발(ARCH_X0, ARCH_Y0)에서 리브 접점 ARCH_Y1까지 전고 그대로다. 수평 소핏이 기둥까지 이어질 뿐.
  const fanVault = INCA_CENTER_MODE === 'mast'
  const slabBase = fanVault ? INCA_ARCH_Y0 : ((MAST_SKIRT === 'slab') ? cutY - INCA_PANEL_T : -0.3)
  const archY0 = fanVault ? INCA_ARCH_Y0 : ((INCA_CENTER_MODE === 'mast' && MAST_SKIRT === 'slab') ? slabBase : 0)
  const arch = []
  for (let f = 0; f <= INCA_FACETS; f++) {
    const t = f / INCA_FACETS
    arch.push({ x: INCA_ARCH_X0 + (INCA_END_X + INCA_BITE - INCA_ARCH_X0) * t,
                y: archY0 + (INCA_ARCH_Y1 - archY0) * Math.sin(t * Math.PI / 2) })
  }
  // ★㊶-7→㊶-8 판: 서단 두께 T의 슬라브, 밑면 = 위로 볼록 곡면(1−cos — 완만 출발 후 급강하)이
  //  '바닥까지'(현도 ㊶-8) — 곡선 종점 = 절단면 발(지면 −0.3 매몰). 판 = 접지 곡면 콘솔.
  //  ★★★94-b 판 = **사다리꼴**(현도 2026.07.31 'plate' 채택). 두 끝 폭이 둘 다 파생이다:
  //   서단 = 하강로 폭(DESC_HW×2) @ x = COR_CX(드럼축 = 사발 최저점 바로 위) — 여기 내려선다
  //   동단 = 10각형 서변(중심 지름) 폭 @ x = ncx + 물림
  //  ⚠구 체제('off'/'cut'/'fan')에선 종전대로 폭 균일 20×5 — 보존계가 썩지 않게 두 경로를 다 산다.
  //  ★94-c 'mast': 사다리꼴 어휘 계승 — 폭 무릎(xm) = 넥서스 서변. [x0→xm] 테이퍼 5→서변폭 ·
  //   [xm→x1] 등폭(넥서스 밑을 지나는 구간 — 림이 덮어 가려진다). 'plate'는 xm = x1(순수 테이퍼).
  const plate = INCA_CENTER_MODE === 'plate', mast = INCA_CENTER_MODE === 'mast'
  const R = nexusR(), ncx = cutX - R
  const px0 = plate ? COR_CX : cutX - INCA_PANEL_L
  const px1 = plate ? ncx + INCA_BITE : cutX + 0.2
  //  ★서변 폭 = 넥서스 폴리곤 서변의 z 스팬(같은 파생을 두 번 쓰지 않도록 여기서 직접 유도)
  const pw1 = (plate || mast) ? nexusWestSpan(ncx, R) : INCA_PANEL_W
  const pw0 = (plate || mast) ? DESC_HW * 2 : INCA_PANEL_W
  const pxm = plate ? px1 : (mast ? ncx : px1)          // 폭 무릎 — 'mast'만 x1보다 서쪽
  //  ★★94-d ⓐ 'mast'에선 밑면이 **평평한 슬라브**다 — 구 콘솔은 '지면까지 흘러듦'이 목적이었고
  //   지면은 ★87로 없어졌으며, 지금 그 자리엔 기둥이 있어 곡선이 기둥을 관통했다(실측 x 199.6~209.7).
  const under = []
  for (let f = 0; f <= INCA_FACETS; f++) {
    const t = f / INCA_FACETS
    under.push({ x: px0 + (px1 - px0) * t,
                 y: mast ? cutY - INCA_PANEL_T
                   : (cutY - INCA_PANEL_T) - (cutY - INCA_PANEL_T + 0.3) * (1 - Math.cos(t * Math.PI / 2)) })
  }
  const panel = { x0: px0, x1: px1, xm: pxm, yTop: cutY, t: INCA_PANEL_T,
                  w0: pw0, w1: pw1, w: Math.max(pw0, pw1), taper: plate || mast, under }
  return { n, rise, td, steps, x0: INCA_X0, x1: INCA_END_X, top: INCA_TOP_Y, run, i0, cutY, cutX, arch, panel, y0: slabBase }
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
//  ★★94 넥서스 서변 x(= 중심 지름의 x) — `descentSpec`이 도착점을 파생시킬 때 쓴다.
//   ⚠`incaBladesSpec()`을 부르면 순환한다(그 함수가 descentSpec을 안 부르긴 하지만 비용이 크다) —
//    ncx = cutX − R 하나면 되므로 경량 함수로 분리한다.
export function incaNexusWestX() { return incaStairSpec().cutX - nexusR() }

//  ★★★94-c 중앙 기둥(mast) — 근거 정본 = constants MAST 블록. **노브는 반지름 하나, 나머지 전부 파생.**
export function mastSpec() {
  if (INCA_CENTER_MODE !== 'mast') return { on: false }
  const st = incaStairSpec()
  const nexUnder = st.cutY + 0.04 - INCA_PANEL_T                  // 넥서스 밑면
  const top = nexUnder + MAST_TOP_BITE                            // 슬라브 속 물림(⚠판 보행면 st.cutY 아래 — 검사)
  const bottom = -Math.sqrt(CUP_R * CUP_R - MAST_R * MAST_R) - MAST_SEAT_BITE   // 껍질 관통 앉힘
  //  ★★94-g 주두는 **솟는 평면**에서 받는다 — 발이 y ARCH_Y0이므로 거기가 받침 자리다.
  //   ⚠구 위치(판 슬라브 밑면)는 아치 발보다 20 위라 실제로 아무것도 안 받고 있었다.
  const capTop = (INCA_CENTER_MODE === 'mast') ? INCA_ARCH_Y0 : st.cutY - INCA_PANEL_T + MAST_TOP_BITE
  return { on: true, cx: COR_CX, r: MAST_R, top: capTop, bottom, h: capTop - bottom, seg: MAST_SEG, nexUnder,
           cap: MAST_CAP, capTop, capBot: capTop - MAST_CAP_H, capH: MAST_CAP_H, slabTop: top }
}

//  ★★★94-d 뿌리 복합체의 **평면 실루엣 반경** — 기둥 축에서 방위 θ로 쏜 광선이 (판 ∪ 넥서스) 밖으로
//   나가는 거리. 주두 상단 링이 이걸 그대로 쓰므로 **평면 돌출이 정의상 0**이다.
export function rootSilhouetteR(theta) {
  const st = incaStairSpec(), ibs = incaBladesSpec(), P = st.panel
  const xm = P.xm ?? P.x1
  const hwPanel = (x) => (x < P.x0 || x > P.x1) ? -1
    : (x >= xm ? P.w1 : P.w0 + (P.w1 - P.w0) * Math.max(0, Math.min(1, (x - P.x0) / (xm - P.x0)))) / 2
  const poly = ibs.nexus
  const inNexus = (x, z) => {                                     // 짝수-홀수 규칙
    let c = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const zi = poly[i].z, zj = poly[j].z
      if ((zi > z) !== (zj > z) && x < (poly[j].x - poly[i].x) * (z - zi) / (zj - zi) + poly[i].x) c = !c
    }
    return c
  }
  const inside = (d) => {
    const x = COR_CX + d * Math.cos(theta), z = d * Math.sin(theta)
    return Math.abs(z) <= hwPanel(x) || inNexus(x, z)
  }
  let lo = 0, hi = 40                                             // 이분 탐색(실루엣은 별형 = 단조 가정 유효)
  if (!inside(0.01)) return MAST_R
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (inside(m)) lo = m; else hi = m }
  return lo
}

//  ★★★94-d 기둥 = 샤프트 + 주두. 주두 옆선 = `1−cos` 위로 볼록 → **t=0에서 dr/dt=0 = 샤프트 접선 연속.**
export function buildMastTris() {
  const M = mastSpec()
  if (!M.on) return null
  const N = M.cap ? MAST_CAP_SEG : M.seg
  const sil = []
  for (let i = 0; i < N; i++) sil.push(M.cap ? rootSilhouetteR((i / N) * Math.PI * 2) : M.r)
  //  링 목록: 밑(발) → 샤프트 상단(주두 밑) → 주두 곡선 → 상단
  const rings = [{ y: M.bottom, f: 0 }, { y: M.cap ? M.capBot : M.top, f: 0 }]
  if (M.cap && MAST_CAP_FORM === 'corbel') {
    //  ★★94-e 코벨(내쌓기) — 단마다 **수평 턱(같은 y에서 반경 점프) + 수직 면**. 각진 어휘(★92-b 계승).
    for (let k = 1; k <= MAST_CAP_N; k++) {
      rings.push({ y: M.capBot + M.capH * ((k - 1) / MAST_CAP_N), f: k / MAST_CAP_N })   // 수평 턱
      rings.push({ y: M.capBot + M.capH * (k / MAST_CAP_N), f: k / MAST_CAP_N })         // 수직 면
    }
  } else if (M.cap) {
    for (let j = 1; j <= MAST_CAP_LAT; j++) rings.push({ y: M.capBot + M.capH * (j / MAST_CAP_LAT), f: j / MAST_CAP_LAT })
  }
  const rAt = (i, f) => M.r + (sil[i] - M.r) * (1 - Math.cos(f * Math.PI / 2))
  const pt = (i, ring) => {
    const t = (i % N) / N * Math.PI * 2, r = rAt(i % N, ring.f)
    return [COR_CX + r * Math.cos(t), ring.y, r * Math.sin(t)]
  }
  const pos = [], nrm = []
  const tri = (a, b, c, hint) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const L = Math.hypot(n[0], n[1], n[2]); if (L < 1e-12) return
    n = [n[0] / L, n[1] / L, n[2] / L]
    let v = [a, b, c]
    if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { n = [-n[0], -n[1], -n[2]]; v = [a, c, b] }
    for (const q of v) { pos.push(q[0], q[1], q[2]); nrm.push(n[0], n[1], n[2]) }
  }
  for (let k = 0; k < rings.length - 1; k++) {
    //  ⚠★94-e 코벨의 **수평 턱**(같은 y에서 반경만 점프)은 법선이 ∓y다 — 반경 힌트를 주면 부호가
    //   불안정해져 감김이 깨진다(1차 구현이 그렇게 났고 `windingConsistent`가 false로 잡았다).
    const flat = Math.abs(rings[k + 1].y - rings[k].y) < 1e-9
    for (let i = 0; i < N; i++) {
      const t = ((i + 0.5) / N) * Math.PI * 2
      const hint = flat ? [0, -1, 0] : [Math.cos(t), 0, Math.sin(t)]
      const a = pt(i, rings[k]), b = pt(i + 1, rings[k]), c = pt(i + 1, rings[k + 1]), d = pt(i, rings[k + 1])
      tri(a, b, c, hint); tri(a, c, d, hint)
    }
  }
  const capRing = (ring, hint) => {                               // 위·아래 뚜껑(팬)
    const ctr = [COR_CX, ring.y, 0]
    for (let i = 0; i < N; i++) tri(ctr, pt(i, ring), pt(i + 1, ring), hint)
  }
  capRing(rings[0], [0, -1, 0])
  capRing(rings[rings.length - 1], [0, 1, 0])
  return { pos, nrm }
}

//  ★★★95 반십각 기둥 — 넥서스 폴리곤을 사발까지 내리 압출한다(현도 2026.08.01).
//   근거 정본 = constants NPIER 블록. **새 단면을 만들지 않는다** — `incaBladesSpec().nexus` 그대로다.
export function nexusPierSpec() {
  const ibs = incaBladesSpec(), st = incaStairSpec()
  if (!NPIER_ON) return { on: false }
  const top = st.cutY + 0.04 - INCA_PANEL_T + NPIER_BITE          // 넥서스 밑면 + 물림
  //  각 점의 사발 깊이(드럼축 기준 반경으로). ⚠중심이 안 맞아 점마다 다르다 — 그래서 밑선이 곡면을 탄다.
  const seatAt = (x, z) => {
    const r = Math.hypot(x - COR_CX, z)
    return -Math.sqrt(Math.max(0, CUP_R * CUP_R - r * r)) - NPIER_SEAT
  }
  //  ★★97-b 칼라 = 치마가 시작하는 선. 'panel'이면 **판 콘솔이 기둥 서면과 만나는 y를 푼다**(파생).
  //   ⚠현도가 두 번 정정한 지점이다 — 처음엔 사발 근처(y 5), 다음엔 기둥 꼭대기로 잡았는데
  //    본뜻은 "사다리꼴 아래 아치 구조물이 사각형 기둥과 만나는 선"이었다.
  const wxFace = Math.min(...ibs.nexus.map((q) => q.x))
  let collar = top
  if (NPIER_COLLAR === 'panel') {
    const U = st.panel.under
    for (let i = 0; i < U.length - 1; i++) {
      if ((U[i].x - wxFace) * (U[i + 1].x - wxFace) <= 0) {
        const u = (wxFace - U[i].x) / (U[i + 1].x - U[i].x)
        collar = U[i].y + (U[i + 1].y - U[i].y) * u
        break
      }
    }
  }
  const poly = ibs.nexus.map((q) => ({ x: q.x, z: q.z, y: seatAt(q.x, q.z) }))
  //  ⚠lo/hi는 **꼭짓점만으로 재면 틀린다** — 밑선이 곡면을 타므로 변 중간이 더 깊을 수 있다.
  //   실제로 서변(중심 지름) z=0에서 드럼축 반경이 최소(10.61)라 그 지점이 전체 최심점이다.
  //   (1차 구현이 꼭짓점만 쟀고 `check_render`의 앉음 판정이 실측 밑단과 안 맞아 즉시 적발됐다.)
  let lo = Infinity, hi = -Infinity
  const NS = Math.max(8, NPIER_LAT)
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    for (let k = 0; k <= NS; k++) {
      const t = k / NS
      const y = seatAt(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)
      lo = Math.min(lo, y); hi = Math.max(hi, y)
    }
  }
  return { on: true, top, collar, poly, seatAt, lo, hi, cx: ibs.ncx }
}

export function buildNexusPierTris() {
  const S = nexusPierSpec()
  if (!S.on) return null
  const P = S.poly, N = P.length
  const tan = Math.tan(NPIER_TAPER * Math.PI / 180)
  const shell = (x, z) => -Math.sqrt(Math.max(0, CUP_R * CUP_R - ((x - COR_CX) ** 2 + z * z)))
  let mx = 0, mz = 0
  for (const q of P) { mx += q.x / N; mz += q.z / N }
  //  ★★97 **미터 오프셋** — 꼭짓점은 이등분선 방향으로 d·tan/cos(반각)만큼 나간다.
  //   그래야 변마다 평면 하나 · 모서리는 능선이 된다(현도 "각진", ⛔둥글림 금지).
  //   ⚠단순히 꼭짓점을 중심에서 멀어지게 밀면(방사 오프셋) 변이 평면이 안 되고 모서리 각이 뭉갠다.
  const edgeN = []
  for (let i = 0; i < N; i++) {
    const a = P[i], b = P[(i + 1) % N]
    let dx = (a.x + b.x) / 2 - mx, dz = (a.z + b.z) / 2 - mz
    const L = Math.hypot(dx, dz); edgeN.push([dx / L, dz / L])
  }
  const vtx = []                                    // 꼭짓점별 {이등분선, 1/cos(반각)}
  for (let i = 0; i < N; i++) {
    const n0 = edgeN[(i - 1 + N) % N], n1 = edgeN[i]
    let bx = n0[0] + n1[0], bz = n0[1] + n1[1]
    const L = Math.hypot(bx, bz) || 1
    bx /= L; bz /= L
    const cosHalf = Math.max(0.2, bx * n1[0] + bz * n1[1])
    vtx.push({ bx, bz, k: 1 / cosHalf })
  }
  //  둘레 표본: 변마다 쪼개되(평면), 꼭짓점은 미터 계수로(능선)
  const ring = []
  for (let i = 0; i < N; i++) {
    const a = P[i], b = P[(i + 1) % N], n = edgeN[i]
    const va = vtx[i], vb = vtx[(i + 1) % N]
    for (let k = 0; k <= NPIER_LAT; k++) {
      const u = k / NPIER_LAT
      const px = a.x + (b.x - a.x) * u, pz = a.z + (b.z - a.z) * u
      //  변 위 점은 변 법선으로, 꼭짓점은 이등분선으로 — u=0/1에서 매끄럽게 넘어가도록 끝점만 교체
      const dir = (k === 0) ? [va.bx * va.k, va.bz * va.k]
        : (k === NPIER_LAT) ? [vb.bx * vb.k, vb.bz * vb.k]
          : [n[0], n[1]]
      ring.push({ px, pz, dx: dir[0], dz: dir[1] })
    }
  }
  //  각 표본이 사발에 닿는 깊이 — 벌어지면서 내려가므로 이분 탐색
  for (const r of ring) {
    //  ★97-b 칼라 위는 수직(벌어짐 0), 아래만 치마 — 벌어짐은 칼라 아래 깊이에 비례한다.
    const spreadAt = (d) => Math.max(0, (S.top - d < S.collar) ? (S.collar - (S.top - d)) : 0) * tan
    let lo = 0, hi = 200
    const f = (d) => (S.top - d) - (shell(r.px + r.dx * spreadAt(d), r.pz + r.dz * spreadAt(d)) - NPIER_SEAT)
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m }
    r.d = (lo + hi) / 2
    const sp = spreadAt(r.d)
    r.lx = r.px + r.dx * sp; r.lz = r.pz + r.dz * sp; r.ly = S.top - r.d
    r.cx0 = r.px + r.dx * 0; r.cz0 = r.pz   // 칼라 단면(수직 구간 끝) = 원단면
  }
  const pos = [], nrm = []
  const tri = (a, b, c, hint) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const L = Math.hypot(n[0], n[1], n[2]); if (L < 1e-12) return
    n = [n[0] / L, n[1] / L, n[2] / L]
    let v = [a, b, c]
    if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { n = [-n[0], -n[1], -n[2]]; v = [a, c, b] }
    for (const q of v) { pos.push(q[0], q[1], q[2]); nrm.push(n[0], n[1], n[2]) }
  }
  const M = ring.length
  //  ★★★97-c 옆면은 **칼라에서 끊어 두 구간**으로 만든다.
  //   ⚠1차 구현은 윗점(y=top)과 밑점만 이어 직선 하나로 그렸다 — 밑점 좌표는 맞는데 **옆선이 칼라에서
  //    안 꺾여** 꼭대기부터 곧장 벌어졌고, 실효각이 10°가 아니라 6.37°로 나왔다(현도 적발: "둘 다
  //    치마가 top에서 시작하는데?"). 칼라 위 수직 구간을 **꼭짓점으로 박아야** 형태가 산다.
  const collarY = Math.min(S.top, Math.max(S.collar, -1e9))
  for (let i = 0; i < M; i++) {
    const r0 = ring[i], r1 = ring[(i + 1) % M]
    const hint = [(r0.lx + r1.lx) / 2 - mx, 0, (r0.lz + r1.lz) / 2 - mz]
    const T0 = [r0.px, S.top, r0.pz], T1 = [r1.px, S.top, r1.pz]
    const C0 = [r0.px, collarY, r0.pz], C1 = [r1.px, collarY, r1.pz]   // 칼라 = 원단면(수직 구간 끝)
    const L0 = [r0.lx, r0.ly, r0.lz], L1 = [r1.lx, r1.ly, r1.lz]
    if (collarY < S.top - 1e-9) {
      tri(T0, T1, C1, hint); tri(T0, C1, C0, hint)        // ① 칼라 위 — 수직 몸통
    }
    tri(C0, C1, L1, hint); tri(C0, L1, L0, hint)          // ② 칼라 아래 — 치마
    tri([mx, S.top, mz], T0, T1, [0, 1, 0])               // 윗 뚜껑
    const cBot = [mx, S.top - ring[0].d, mz]
    tri(cBot, L0, L1, [0, -1, 0])                         // 밑 뚜껑
  }
  return { pos, nrm, ring }
}

//  ★★★96 사발 헌치 — 반십각 기둥 밑동을 사발이 올라와 받는 경사면(현도 2026.08.01).
//   근거 정본 = constants NHAUNCH 블록. **각도가 노브 · 높이는 파생**(서쪽 끝 = 사발 극점).
export function nexusHaunchSpec() {
  const S = nexusPierSpec()
  if (!NHAUNCH_ON || !S.on) return { on: false }
  const tan = Math.tan(NHAUNCH_ANG * Math.PI / 180)
  //  ★높이 파생: 서변 z=0 지점에서 그 각으로 내려가면 정확히 극점(COR_CX, −CUP_R)에 닿는다.
  const wx = Math.min(...S.poly.map((q) => q.x))          // 서변 x(= 중심 지름)
  const run = wx - COR_CX                                 // 극점까지 수평거리
  //  ⚠1차 구현이 부호를 뒤집었다: 착지 y = (밑선 + H) − run·tan 이 **극점의 묻힌 깊이**와 같아야 하므로
  //   H = run·tan − (밑선 + CUP_R + SEAT). 구식(+0.6)은 H가 1.5 과대라 서쪽 끝이 극점을 1~1.4 지나쳤고,
  //   각을 40°로 낮췄을 때 가드가 울려 잡혔다(50°에선 공차 안이라 안 보였다 — 스윕이 아니었으면 놓쳤다).
  const H = run * tan - (S.seatAt(wx, 0) + CUP_R + NHAUNCH_SEAT)
  return { on: true, tan, H, ang: NHAUNCH_ANG, run, pier: S }
}

//  ★검사가 밑선을 실측할 수 있게 링을 내보낸다(검사가 기하를 재구현하면 언젠가 어긋난다).
export function nexusHaunchRing() { const t = buildNexusHaunchTris(); return t ? t.ring : null }

export function buildNexusHaunchTris() {
  const A = nexusHaunchSpec()
  if (!A.on) return null
  const S = A.pier, P = S.poly, N = P.length
  //  폴리곤 중심(안쪽 방향 판정용) — 반십각은 볼록이다
  let mx = 0, mz = 0
  for (const q of P) { mx += q.x / N; mz += q.z / N }
  const shell = (x, z) => -Math.sqrt(Math.max(0, CUP_R * CUP_R - ((x - COR_CX) ** 2 + z * z)))
  //  ★바깥으로 내려가 사발과 만나는 지점 — **행진해서 찾는다**(닫힌 해가 없다: 사발도 곡면)
  const landing = (px, pz, dx, dz, yTop, slope = A.tan) => {
    let lo = 0, hi = 80
    const f = (t) => (yTop - t * slope) - shell(px + dx * t, pz + dz * t)
    if (f(hi) > 0) hi = 200
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m }
    return (lo + hi) / 2
  }
  //  ── 링 구성: 변마다 법선 방향, 모서리마다 부챗살로 방향을 벌린다(볼록 코너 메움) ──
  const ring = []
  const edgeDir = []
  for (let i = 0; i < N; i++) {
    const a = P[i], b = P[(i + 1) % N]
    let dx = (a.x + b.x) / 2 - mx, dz = (a.z + b.z) / 2 - mz
    const L = Math.hypot(dx, dz); edgeDir.push([dx / L, dz / L])
  }
  for (let i = 0; i < N; i++) {
    const a = P[i], b = P[(i + 1) % N]
    const d = edgeDir[i]
    //  ⚠변을 쪼갠다 — 극점으로 가는 지점은 서변 한가운데(z=0)뿐이라 끝점만 재면 통째로 빠진다.
    for (let k = 0; k <= NHAUNCH_LAT; k++) {
      const u = k / NHAUNCH_LAT
      const px = a.x + (b.x - a.x) * u, pz = a.z + (b.z - a.z) * u
      const yT = S.seatAt(px, pz) + A.H
      const t = landing(px, pz, d[0], d[1], yT)
      ring.push({ px, pz, yT, lx: px + d[0] * t, lz: pz + d[1] * t })
    }
    //  ── 모서리 b ──
    const d2 = edgeDir[(i + 1) % N]
    const a0 = Math.atan2(d[1], d[0]); let a1 = Math.atan2(d2[1], d2[0])
    while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI
    while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI
    const yTb = S.seatAt(b.x, b.z) + A.H
    if (NHAUNCH_CORNER === 'ridge') {
      //  ★★96-b **능선 하나** — 두 평면의 교선이다(현도 "각진 경사면", 둥글림 반려).
      //   ⚠교선 방향으로는 **더 완만하게** 내려간다: 평면이 법선 방향으로 tan이면 이등분선 방향은
      //    tan·cos(반각)이다. 이 보정을 빼먹으면 능선이 평면보다 먼저 사발에 닿아 모서리가 잘려 보인다.
      const th = (a0 + a1) / 2, half = Math.abs(a1 - a0) / 2
      const dx = Math.cos(th), dz = Math.sin(th)
      const t = landing(b.x, b.z, dx, dz, yTb, A.tan * Math.cos(half))
      ring.push({ px: b.x, pz: b.z, yT: yTb, lx: b.x + dx * t, lz: b.z + dz * t })
    } else {
      for (let k = 1; k < NHAUNCH_FAN; k++) {
        const th = a0 + (a1 - a0) * (k / NHAUNCH_FAN)
        const dx = Math.cos(th), dz = Math.sin(th)
        const t = landing(b.x, b.z, dx, dz, yTb)
        ring.push({ px: b.x, pz: b.z, yT: yTb, lx: b.x + dx * t, lz: b.z + dz * t })
      }
    }
  }
  //  ── 삼각형 ──
  const pos = [], nrm = []
  const tri = (a, b, c, hint) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const L = Math.hypot(n[0], n[1], n[2]); if (L < 1e-12) return
    n = [n[0] / L, n[1] / L, n[2] / L]
    let v = [a, b, c]
    if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { n = [-n[0], -n[1], -n[2]]; v = [a, c, b] }
    for (const q of v) { pos.push(q[0], q[1], q[2]); nrm.push(n[0], n[1], n[2]) }
  }
  const M = ring.length
  const inward = (r) => {                                  // 안쪽(기둥 속) 물림 좌표
    let dx = mx - r.px, dz = mz - r.pz
    const L = Math.hypot(dx, dz) || 1
    return [r.px + dx / L * NHAUNCH_BITE, r.pz + dz / L * NHAUNCH_BITE]
  }
  for (let i = 0; i < M; i++) {
    const r0 = ring[i], r1 = ring[(i + 1) % M]
    const [i0x, i0z] = inward(r0), [i1x, i1z] = inward(r1)
    const T0 = [i0x, r0.yT, i0z], T1 = [i1x, r1.yT, i1z]
    const L0 = [r0.lx, shell(r0.lx, r0.lz) - NHAUNCH_SEAT, r0.lz]
    const L1 = [r1.lx, shell(r1.lx, r1.lz) - NHAUNCH_SEAT, r1.lz]
    const B0 = [i0x, shell(i0x, i0z) - NHAUNCH_SEAT, i0z]
    const B1 = [i1x, shell(i1x, i1z) - NHAUNCH_SEAT, i1z]
    const out = [(r0.lx + r1.lx) / 2 - mx, 0, (r0.lz + r1.lz) / 2 - mz]
    tri(T0, T1, L1, out); tri(T0, L1, L0, out)             // 바깥 경사면
    tri(L0, L1, B1, [0, -1, 0]); tri(L0, B1, B0, [0, -1, 0])  // 밑면(사발에 잠김)
    tri(B0, B1, T1, [-out[0], 0, -out[2]]); tri(B0, T1, T0, [-out[0], 0, -out[2]])  // 안쪽(기둥 속)
  }
  return { pos, nrm, ring }
}

export function buildNexusHaunch() {
  const t = buildNexusHaunchTris(); if (!t) return null
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(t.nrm, 3))
  return g
}

//  ★★97 밑선 범위는 **실기하에서 유도한다** — 테이퍼가 켜지면 발자국이 커져 더 깊이 내려가므로
//   `nexusPierSpec().lo`(테이퍼 없는 발자국 기준)를 쓰면 틀린다(★97에서 실제로 어긋나 검사가 잡았다).
export function nexusPierBottom() {
  const t = buildNexusPierTris()
  if (!t) return null
  let lo = Infinity, hi = -Infinity
  for (const r of t.ring) { lo = Math.min(lo, r.ly); hi = Math.max(hi, r.ly) }
  return { lo, hi }
}

//  ★★★98 서쪽 빗면 버트레스 — 근거 정본 = constants WBUT 블록.
//   기점 = **판 콘솔 ∩ 기둥 서면**(둘 다 곡선/사면이라 닫힌 해가 없다 → 반복법). 폭 = 그 x의 판 폭.
export function westButtressSpec() {
  const S = nexusPierSpec()
  if (!WBUT_ON || !S.on) return { on: false }
  const st = incaStairSpec(), P = st.panel
  const tanP = Math.tan(NPIER_TAPER * Math.PI / 180)
  const wx0 = Math.min(...S.poly.map((q) => q.x))          // 기둥 서면(칼라 높이) x
  const U = P.under
  const consoleY = (x) => {                                // 판 콘솔 y(x) — 선형 보간
    for (let i = 0; i < U.length - 1; i++)
      if ((U[i].x - x) * (U[i + 1].x - x) <= 0) {
        const t = (x - U[i].x) / (U[i + 1].x - U[i].x)
        return U[i].y + (U[i + 1].y - U[i].y) * t
      }
    return null
  }
  //  ★반복: y → 서면 x(y) → 콘솔 y(x) → … 수렴한다(둘 다 단조라 고정점이 하나)
  let y = 10
  for (let i = 0; i < 120; i++) {
    const fx = wx0 - Math.max(0, S.collar - y) * tanP
    const cy = consoleY(fx)
    if (cy === null) break
    y = cy
  }
  const x = wx0 - Math.max(0, S.collar - y) * tanP
  const xm = P.xm ?? P.x1
  const hw = (P.x0 <= x && x <= P.x1)
    ? (x >= xm ? P.w1 : P.w0 + (P.w1 - P.w0) * Math.max(0, Math.min(1, (x - P.x0) / (xm - P.x0)))) / 2
    : P.w1 / 2
  return { on: true, x, y, hw, tan: Math.tan(WBUT_ANG * Math.PI / 180), ang: WBUT_ANG, pier: S }
}

//  ★★★98 **닫힌 솔리드**다(현도: "옆면도 전부 채운 덩어리. 종잇장처럼 면 하나만 만드는 게 아니다").
//   구성 = 위 모서리(교점선, z ±hw) → 아래 모서리(사발 착지선). 옆면 둘 · 앞면(경사) · 뒷면(기둥 속) · 밑면.
export function buildWestButtressTris() {
  const B = westButtressSpec()
  if (!B.on) return null
  const shell = (x, z) => -Math.sqrt(Math.max(0, CUP_R * CUP_R - ((x - COR_CX) ** 2 + z * z)))
  //  z 표본마다 서쪽·아래로 내려가 사발에 닿는 깊이를 푼다(밑선이 곡면을 탄다)
  const zs = []
  for (let k = 0; k <= WBUT_LAT; k++) zs.push(-B.hw + (2 * B.hw) * (k / WBUT_LAT))
  const front = zs.map((z) => {
    let lo = 0, hi = 300
    const f = (d) => (B.y - d) - (shell(B.x - d * B.tan, z) - WBUT_SEAT)
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m }
    const d = (lo + hi) / 2
    return { z, tx: B.x, ty: B.y, bx: B.x - d * B.tan, by: B.y - d }
  })
  //  뒷면 = 기둥 속으로 물린 수직면(그 자리에서 사발까지)
  const back = zs.map((z) => {
    const bx = B.x + WBUT_BITE
    return { z, tx: bx, ty: B.y, bx, by: shell(bx, z) - WBUT_SEAT }
  })
  const pos = [], nrm = []
  const tri = (a, b, c, hint) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const L = Math.hypot(n[0], n[1], n[2]); if (L < 1e-12) return
    n = [n[0] / L, n[1] / L, n[2] / L]
    let v = [a, b, c]
    if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { n = [-n[0], -n[1], -n[2]]; v = [a, c, b] }
    for (const q of v) { pos.push(q[0], q[1], q[2]); nrm.push(n[0], n[1], n[2]) }
  }
  const quad = (a, b, c, d, h) => { tri(a, b, c, h); tri(a, c, d, h) }
  const N = zs.length
  for (let i = 0; i < N - 1; i++) {
    const f0 = front[i], f1 = front[i + 1], k0 = back[i], k1 = back[i + 1]
    quad([f0.tx, f0.ty, f0.z], [f1.tx, f1.ty, f1.z], [f1.bx, f1.by, f1.z], [f0.bx, f0.by, f0.z], [-1, 0, 0])   // 앞 경사면
    quad([k0.tx, k0.ty, k0.z], [k1.tx, k1.ty, k1.z], [k1.bx, k1.by, k1.z], [k0.bx, k0.by, k0.z], [1, 0, 0])    // 뒷면(기둥 속)
    quad([f0.tx, f0.ty, f0.z], [f1.tx, f1.ty, f1.z], [k1.tx, k1.ty, k1.z], [k0.tx, k0.ty, k0.z], [0, 1, 0])    // 윗면(교점선)
    quad([f0.bx, f0.by, f0.z], [f1.bx, f1.by, f1.z], [k1.bx, k1.by, k1.z], [k0.bx, k0.by, k0.z], [0, -1, 0])   // 밑면(사발)
  }
  //  ★★옆면 둘 — 이걸 빼면 **종잇장**이 된다(현도 명시 경고 · ★62 링 슬롯 전례)
  for (const [idx, h] of [[0, [0, 0, -1]], [N - 1, [0, 0, 1]]]) {
    const f = front[idx], k = back[idx]
    quad([f.tx, f.ty, f.z], [k.tx, k.ty, k.z], [k.bx, k.by, k.z], [f.bx, f.by, f.z], h)
  }
  return { pos, nrm, front, back }
}

export function buildWestButtress() {
  const t = buildWestButtressTris(); if (!t) return null
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(t.nrm, 3))
  return g
}

export function buildNexusPier() {
  const t = buildNexusPierTris(); if (!t) return null
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(t.nrm, 3))
  return g
}

export function buildMast() {
  const t = buildMastTris(); if (!t) return null
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(t.nrm, 3))
  return g
}

//  ★★★94-b 진입 판 기하 — **정본 하나**(Corridor.jsx·render_views가 같은 함수를 쓴다. 사본 금지).
//  ⚠압출(ExtrudeGeometry)로는 못 만든다 — 폭이 x를 따라 변하는 사다리꼴이기 때문이다
//   (같은 이유의 경고가 잉카 매스 주석에 이미 적혀 있었다: \"폭 사다리꼴을 쓰려면 수제 쿼드로 회귀\").
//  구성 = 단면 폴리곤 P(x–y)를 z ∈ [−hw(x), +hw(x)]로 쓸어낸 솔리드.
//   · ±z 면 = P를 삼각분할해 z = ±hw(x)로 올린 두 장(폭이 변하므로 **기운 면**이다)
//   · 테두리 = P의 각 변을 −hw → +hw로 이은 쿼드
//  ★법선은 면 기하에서 뽑고 힌트는 부호만 정한다(★92·★93에서 세운 규율).
//   ⚠`outwardTris`(중심 기준)를 쓰면 안 된다 — 이 단면은 밑곡선 때문에 **볼록이 아니다**.
export function buildIncaPanelTris() {
  const { panel } = incaStairSpec()
  const P = [[panel.x0, panel.yTop], [panel.x1, panel.yTop], [panel.x1, -0.3]]
  for (let i = panel.under.length - 1; i >= 1; i--) P.push([panel.under[i].x, panel.under[i].y])
  P.push([panel.x0 + INCA_CHAMF, panel.yTop - panel.t], [panel.x0, panel.yTop - panel.t + INCA_CHAMF])
  //  ★반시계로 정규화(테두리 바깥 법선을 (dy, −dx)로 쓰기 위한 전제)
  let area2 = 0
  for (let i = 0; i < P.length; i++) { const q = P[(i + 1) % P.length]; area2 += P[i][0] * q[1] - q[0] * P[i][1] }
  if (area2 < 0) P.reverse()
  //  ★94-c 폭 = 무릎(xm) 있는 조각선형: [x0→xm] 테이퍼 · [xm→x1] 등폭(w1)
  const xm = panel.xm ?? panel.x1
  const span = xm - panel.x0
  const hw = (x) => (x >= xm ? panel.w1
    : panel.w0 + (panel.w1 - panel.w0) * (span === 0 ? 0 : Math.max(0, Math.min(1, (x - panel.x0) / span)))) / 2
  const pos = [], nrm = []
  const tri = (a, b, c, hint) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const L = Math.hypot(n[0], n[1], n[2]); if (L < 1e-12) return
    n = [n[0] / L, n[1] / L, n[2] / L]
    let v = [a, b, c]
    if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { n = [-n[0], -n[1], -n[2]]; v = [a, c, b] }
    for (const q of v) { pos.push(q[0], q[1], q[2]); nrm.push(n[0], n[1], n[2]) }
  }
  const at = (i, sgn) => [P[i][0], P[i][1], sgn * hw(P[i][0])]
  const faces = THREE.ShapeUtils.triangulateShape(P.map((q) => new THREE.Vector2(q[0], q[1])), [])
  for (const [i, j, k] of faces) {
    tri(at(i, +1), at(j, +1), at(k, +1), [0, 0, 1])            // +z 면
    tri(at(i, -1), at(j, -1), at(k, -1), [0, 0, -1])           // −z 면
  }
  for (let i = 0; i < P.length; i++) {                          // 테두리
    const j = (i + 1) % P.length
    const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1]
    const hint = [dy, -dx, 0]                                   // 반시계 폴리곤의 바깥 법선
    tri(at(i, -1), at(j, -1), at(j, +1), hint)
    tri(at(i, -1), at(j, +1), at(i, +1), hint)
  }
  return { pos, nrm }
}

export function buildIncaPanel() {
  const { pos, nrm } = buildIncaPanelTris()
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  return g
}

//  ★★94-b 넥서스 서변(중심 지름)의 z 스팬 — 판 동단 폭이 이걸 그대로 쓴다.
//   ⚠`incaBladesSpec()`을 부르면 순환한다(그 함수가 incaStairSpec을 부른다) → 방위·경계만으로 재유도한다.
export function nexusWestSpan(ncx, R) {
  const az = bladeAzAt(ncx)
  const bnd = [az[0] - (az[1] - az[0]) / 2]
  for (let i = 0; i < 4; i++) bnd.push((az[i] + az[i + 1]) / 2)
  bnd.push(az[4] + (az[4] - az[3]) / 2)
  let maxHalf = 0
  for (let i = 0; i < 5; i++) maxHalf = Math.max(maxHalf, (bnd[i + 1] - bnd[i]) / 2)
  const rimR = (R + INCA_RIM_CLR) / Math.cos(maxHalf)
  return rimR * (Math.sin(bnd[5]) - Math.sin(bnd[0]))
}

export function incaBladesSpec() {
  const base = incaStairSpec()
  const R = nexusR()                                          // ★94 체제별 파생
  const ncx = base.cutX - R                                   // 넥서스 중심(파생 — 동변 = 절단면)
  const blades = []
  for (const k of [-2, -1, 0, 1, 2]) {
    const phi = (k / MERIDIANS) * Math.PI * 2
    const rx = R_BASE * Math.cos(phi), rz = R_BASE * Math.sin(phi)
    const dx = rx - ncx, dz = rz, L = Math.hypot(dx, dz)
    const fx = rx - SHELL_RIB_R * dx / L, fz = rz - SHELL_RIB_R * dz / L   // 리브 내측면 점(넥서스 방향)
    const az = Math.atan2(fz, fx - ncx), faceDist = Math.hypot(fx - ncx, fz)
    if (k === 0) { blades.push({ k, az, faceDist, reach: true, ribC: [rx, rz] }); continue }
    const tipY = Math.abs(k) === 1 ? INCA_TIP_Y1 : INCA_TIP_Y2
    //  ★★94-g 날 뿌리 = **주두 림**(그 방위의 뿌리 실루엣) — 다섯이 전부 기둥에서 솟는다.
    //   ⚠현도 승인: "미세하게 바껴도 괜찮으니까 그냥 가자"(디딤이 조금 길어진다).
    //  ⚠실루엣으로 잡으면 `rootSilhouetteR` → `incaBladesSpec` **순환**이 난다(스택 초과로 즉시 적발).
    //   발은 애초에 **샤프트 면**이므로(현도 승인 "발 = 반경 6 = 기둥 면") MAST_R이 맞고 순환도 없다.
    const s0 = (INCA_CENTER_MODE === 'mast') ? MAST_R : R - INCA_EMBED
    const sTip = faceDist - INCA_GAP
    const nB = Math.max(2, Math.round((tipY - base.cutY) / base.rise))     // 단높이 = #0 rise 어휘 공유
    const rb = (tipY - base.cutY) / nB, tb = (sTip - s0) / nB
    const steps = []
    for (let i = 0; i < nB; i++)
      steps.push({ s0: s0 + i * tb, s1: s0 + (i + 1) * tb, yTop: base.cutY + (i + 1) * rb })
    //  ★★94-d ⓑ 뿌리 전고 — 'mast'+'slab'이면 **슬라브 두께**(지면이 없으므로 −0.3까지 갈 이유가 없다).
    //   두께 프로파일 기계는 그대로라 팁 소멸(1p5 논증)은 무손상이다.
    //  ★★94-g 뿌리 전고 = 상면(cutY) ↔ **솟는 평면**. 두께 프로파일 기계는 그대로다(팁 소멸 무손상).
    const rootH = (INCA_CENTER_MODE === 'mast')
      ? base.cutY - INCA_ARCH_Y0 - INCA_TIP_T
      : ((MAST_SKIRT === 'slab') ? INCA_PANEL_T - INCA_TIP_T : base.cutY + 0.3 - INCA_TIP_T)
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
  //  ★★94 림 물림 = **파생**(구 하드코딩 `R + 0.4`는 R=12에서만 맞았다 — ★92 '다각형' 계열 잠복 버그).
  //   변의 중심거리 = rimR·cos(half). 변이 R을 덮으려면 rimR ≥ (R + CLR)/cos(half) — half는 변마다
  //   다르므로(리브 방위 스냅) **최대 half**로 잡는다. 실측: R 12 → 12.42 · R 22.61 → 23.13.
  let maxHalf = 0
  for (let i = 0; i < 5; i++) maxHalf = Math.max(maxHalf, (bnd[i + 1] - bnd[i]) / 2)
  const rimR = (R + INCA_RIM_CLR) / Math.cos(maxHalf)
  const nexus = [{ x: ncx, z: rimR * Math.sin(bnd[0]) }]
  for (const a of bnd) nexus.push({ x: ncx + rimR * Math.cos(a), z: rimR * Math.sin(a) })
  nexus.push({ x: ncx, z: rimR * Math.sin(bnd[5]) })
  //  ★★94-g 넥서스 깊이 = 상면 ↔ **솟는 평면**(기둥 위에 앉은 드럼). 구 체제는 판 두께 그대로.
  //   ⚠정본 하나 — Corridor·render_views가 이 값을 쓴다(각자 계산하면 언젠가 어긋난다).
  const depth = (INCA_CENTER_MODE === 'mast') ? (base.cutY + 0.04 - INCA_ARCH_Y0) : INCA_PANEL_T
  return { ncx, blades, nexus, bnd, rimR, R, maxHalf, depth, cutY: base.cutY }
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
  // ★밑동·절단면·리드 전부 수평(현도 07.22 최종) → 크라운 = 완전한 수직 원통: 벽 높이·기둥 길이 균일,
  //  요구 처마 최소. 빗면 평행 안은 폐기(constants ⛔ 주석 — 쐐기 슬릿·접시 처마).
  //  ⚠수직 사슬은 `gatCap()`(constants ★89)이 정본이다 — ★89 테라스가 같은 값을 쓰므로 여기서 다시 쓰지 않는다.
  const { baseY, cutY, lidY } = gatCap()

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
  //  ★54 구멍 봉합(2026.07.24): 위 표본의 최고점은 y77인데 **하강로는 y38~101을 걷는다**.
  //   높은 시점일수록 밑동 개구를 얕은 각으로 통과해 리드 밑을 훔쳐볼 수 있어 요구 처마가 커지므로,
  //   빠져 있으면 노브를 돌렸을 때 아무도 모르게 봉인이 깨진다(현행 값에선 통과 — 요구 4.86 < 5.57).
  //   ⚠재귀 금지: descentSpec은 gatSeal을 부르지 않는다(woldaeSpec만 부른다) — 호출 방향 단방향 유지.
  if (HALL_ENTRY === 'axial' || HALL_ENTRY === 'lateral') {
    const dp = descentSpec(HALL_ENTRY)
    for (let i = 0; i < dp.plates.length; i += 4) {
      const p = dp.plates[i]; W.push({ x: p.x, z: p.z, y: p.yTop })
    }
    const wd = dp.woldae                                           // 월대 상면 격자(가장 높은 보행면)
    if (wd.on) for (let i = 0; i <= 4; i++) for (let j = -3; j <= 3; j++) {
      const x = BOX_X1 + (wd.x1 - BOX_X1) * (i / 4)
      W.push({ x, z: wd.hwAt(x) * (j / 3), y: wd.yTop })
    }
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

// ============================================================================
//  ★56 리브 절단(1p7) — 순수 빌더. Dome(렌더 CSG)·check_corridor(검증)가 같은 정본을 소비
// ============================================================================
//  1p7 "실체의 본성에는 존재가 속한다". 증명은 1p6에 기댄다 — 다른 것이 산출할 수 없으므로
//  자기 원인이고, 따라서 밑에 **아무것도 없어야** 한다. 그래서 끊고, 떠 있게 둔다.
//
//  ★설계 불변식 셋(어기면 1p7이 반대로 읽히거나 봉인이 깨진다 — R6절이 전부 강제):
//   ① 절단 구간 ⊂ [FR_FLOOR_Y, 방 천장 − RIB_CUT_HEAD] — 방 밖 어느 시점에서도 불가시(LOCKED 예외 #2의 조건).
//   ② 간극 > INCA_GAP(1p5의 5) — 1p5의 '못 닿음'과 1p7의 '끊김'이 같은 크기면 두 정리가 섞여 읽힌다.
//   ③ 다섯 높이는 층화 배정 — 같은 높이면 그 선이 공통 기준면이 되어 "함께 결정됨"이 된다(1p7의 정반대).
//
//  ⚠**끊은 자리는 반드시 캡으로 막는다.** 리브 관은 두께 0 셸이라, 안 막으면 절단면이 뚫린
//   파이프 아가리가 되고 보어가 통째로 열린다(아랫토막은 아래로 홀까지, 윗토막은 위로 정점까지).
//   구 폴 절단의 '평면 캡(뭉툭)' 어휘를 그대로 계승 — 잘린 단면이 면으로 읽히는 편이 조형적으로도 낫다.
import { mulberry32 } from './lensGeometry.js'   // 결정론 PRNG — 렌즈(원석 시드)와 같은 것을 쓴다(중복 정의 금지)

//  리브 중심선의 수직 대비 기울기(rad) — 수평으로 자르면 단면이 타원이 되므로 캡 반경 보정에 쓴다
function ribTilt(y) {
  const u = y / H, du = 1e-4
  const dr = (rOf(u + du) - rOf(u - du)) / (2 * du)
  return Math.atan2(Math.abs(dr), H)
}

export function ribCutSpec() {
  if (!RIB_CUT_ON || !FRIEZE_ROOM_ON) return []
  const doors = hallDoors(), n = doors.length
  const rnd = mulberry32(RIB_CUT_SEED)

  //  ★공통 창을 쓴다(리브별 창이 아니라). 천장이 동쪽으로 기울어 리브마다 상한이 다른데,
  //   각자의 창에 따로 뽑으면 이격이 창 폭에 좌우돼 통제가 안 된다 → **가장 낮은 천장**에 맞춘다.
  //   대가 = #0가 갈 수 있는 높이를 조금 양보. 소득 = 다섯의 이격이 SEP로 보장된다.
  const ceilOf = (phi) => ceilY(rOf((FR_FLOOR_Y + 20) / H) * Math.cos(phi)) - 0.02 - FR_CEIL_T
  const hi = Math.min(...doors.map(d => ceilOf(d.phi))) - RIB_CUT_HEAD
  //  창의 아래끝 = '윗토막 밑끝'이 가질 수 있는 최저값. 간극 하한은 두 모드 공통,
  //  'stub'은 그루터기 최소 높이만큼 더 밀려 올라간다.
  const lo = FR_FLOOR_Y + RIB_CUT_GAP_MIN + (RIB_CUT_MODE === 'stub' ? RIB_CUT_STUB_MIN : 0)

  //  ★최소 이격 + 무작위 여유: 정렬한 균등난수에 여유를 실어 얹고 i·SEP를 더한다.
  //   → 이격 ≥ SEP는 구조적으로 보장(검사가 아니라 구성이 보장), 그 위 간격은 불규칙.
  const slack = Math.max(0, (hi - lo) - RIB_CUT_SEP * (n - 1))
  const srt = Array.from({ length: n }, () => rnd()).sort((a, b) => a - b)
  let tops = srt.map((u, i) => lo + u * slack + i * RIB_CUT_SEP)
  //  ⚠섞는다 — 안 섞으면 높이가 k 순서대로 단조 증가해 **경사 램프**로 읽힌다(그것도 질서다).
  for (let i = tops.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [tops[i], tops[j]] = [tops[j], tops[i]] }

  return doors.map((d, i) => {
    const yTop = tops[i]
    //  'floor' — 바닥에서 끊긴다: 아랫토막이 방에 없다. 간극 = 바닥~윗토막(제각각).
    //  'stub'  — 그루터기가 남는다: 간극은 균일(GAP_MIN), 그루터기 끝이 제각각.
    const yBot = (RIB_CUT_MODE === 'floor') ? FR_FLOOR_Y : yTop - RIB_CUT_GAP_MIN
    const yCeil = ceilOf(d.phi)
    const rB = rOf(yBot / H), rT = rOf(yTop / H)
    //  캡 반경: 기운 관의 수평 단면 = 타원(장축 R/cosθ) → 그만큼 덮는다.
    //  ⚠'floor' 모드 아랫캡만 예외 — **바닥 관통 구멍(R+TEMPLE_CLR)을 메우는 마개**를 겸한다.
    //   안 메우면 리브가 사라진 자리에 반경 6.4 수직 샤프트가 열려 아치 터널→홀까지 뚫린다.
    //  ⚠★60(2026.07.24) 초승달 틈 수리: 구멍은 **수직 원기둥**이라 중심이 hallDoors()의 (cx,cz)에
    //   고정인데, 캡 중심은 리브 중심선을 따라간 (bx,bz)다. 리브가 휘어 있어 둘이 **0.054 어긋난다**
    //   → 반경을 정확히 6.4로 잡으면 한쪽에 폭 0.054의 초승달이 남는다(실측). 여유를 실어 덮는다.
    //   구 검사는 `capB ≥ 구멍반경`만 봐서 이 어긋남을 못 잡았다 — R9절이 어긋남까지 포함해 다시 잡는다.
    const capB = (RIB_CUT_MODE === 'floor')
      ? SHELL_RIB_R + TEMPLE_CLR + RIB_CUT_CAP_MG
      : SHELL_RIB_R / Math.cos(ribTilt(yBot)) + RIB_CUT_CAP_MG
    const capT = SHELL_RIB_R / Math.cos(ribTilt(yTop)) + RIB_CUT_CAP_MG
    return {
      k: d.k, phi: d.phi,
      yBot, yTop, gap: yTop - yBot, yCeil, headroom: yCeil - yTop, winLo: lo, winHi: hi,
      bx: rB * Math.cos(d.phi), bz: rB * Math.sin(d.phi),     // 아랫 절단면 중심(월드)
      tx: rT * Math.cos(d.phi), tz: rT * Math.sin(d.phi),     // 윗 절단면 중심(월드)
      capB, capT, capH: RIB_CUT_CAP_T,
      plugsFloorHole: RIB_CUT_MODE === 'floor',
    }
  })
}

// ── ★77 서벽 창살(세로살)의 z 위치 — **리브에서 파생한다** ──
//  현도 지정: "창살은 세로살만이고 리브 개수와 간격에 맞게". 그래서 개수도 간격도 여기서 쓰지 않는다 —
//  hallDoors()의 방위를 창 중간 높이에서 z로 투영해 그대로 쓴다. 리브 방위가 바뀌면 살이 따라온다.
//  ⚠리브의 z는 높이에 따라 조금 변한다(r이 y를 따라 변하므로) → 대표점 = 창 중간 높이. 창을 위아래로
//   옮기면 살도 미세하게 움직이는데, 그게 맞다(살은 리브를 가리키는 것이지 절대 좌표가 아니다).
export function friezeWinBarZ() {
  if (!FR_WIN_ON || !FR_WIN_BAR_ON) return []
  const yMid = (FR_WIN_SILL + FR_WIN_HEAD) / 2
  const r = rOf(yMid / H)
  const zs = hallDoors().map(d => r * Math.sin(d.phi)).sort((a, b) => a - b)
  if (FR_WIN_BAR_ALIGN === 'between') {
    const mid = []
    for (let i = 1; i < zs.length; i++) mid.push((zs[i] + zs[i - 1]) / 2)
    return mid
  }
  return zs
}
