// bridgeTrapGeometry.js — ★★★150 사다리꼴 관(현도 스케치 2026.08.20) — 고딕 볼트(★148) 대체
//  단면 = 45° 스커트(발 벌어짐 1.9) → 69.5° 빗면(처마 내림 2.2) → 수직 슬릿 구간(3.0, 슬릿 1.35)
//   → 밑변 없는 사다리꼴 갓(돌출 0.5 · 마루 폭 3.1 · 마루 중심선 147.941).
//  ★전 부재 = **등단면 프리즘**(x 22.2→145 압출) — 부피 = 단면적 × 122.80 **정확식**이 성립해
//   검사가 감김·중복을 부피 하나로 잠근다(★149 칸별 상자 사고의 사후 봉인).
//  ★접합 = 침강(연장 물림) 어법: 스커트 밑끝은 데크 살 속, 빗면 위끝은 토막 살 속, 갓 마루판은
//   갓 빗판 살 속으로 각각 0.5(SPIRE_SINK) 연장. 갓 밑의 바깥쪽 노출 밑면 = 의도된 처마 소핏.
//  ⚠서단 입(첨탑) = 대역 ⓚ′가 다시 덮는다(3세그 유일 스냅이 새 입 최대폭 4.213도 덮는 것 실측).
//   초승달·문은 ★147-d 그대로 미룸. 동단 교차부 = 노치 동결선(constants 참조) · 현도 결정 대기.
import * as THREE from 'three'
import { orientOutward } from './orientGeo.js'
import {
  BRD_TRP_ON, BRD_TRP_O2, BRD_TRP_JZ, BRD_TRP_JY, BRD_TRP_AY, BRD_TRP_SLOPE,
  BRD_TRP_TIPZ, BRD_TRP_TIPY, BRD_TRP_SLIT, BRD_TRP_STUB, BRD_TRP_C0Z, BRD_TRP_C0Y,
  BRD_TRP_CAPY, BRD_TRP_M, BRD_TRP_OVH,
  BRD_TRP_PNL, BRD_TRP_PNL_N, BRD_TRP_PNL_R, BRD_TRP_PNL_G, BRD_TRP_PNL_DP, BRD_TRP_PNL_FW, BRD_TRP_D,
  BRD_COL_ON, BRD_COL_W, BRD_COL_CLR, BRD_COL_CURVE, BRD_COL_SECT, BRD_COL_R, BRD_COL_TH0,
  BRD_X0, BRD_EAST_X, BRD_HW, BRD_T, BRD_YW, SPIRE_SINK, BRD_BAND_ON, BRD_WCUT,
  BRD_END_ON, BRD_END_X1, BRD_END_Y1, BRD_END_K, brdEndX, BRD_CEIL_LAP, BRD_DECK_BOT,
  BRD_PROW_ON, BRD_PROW_X0, BRD_PROW_Z0, BRD_PROW_Z1, BRD_PROW_K, brdSlantX, brdProwX, brdCrossZ,
  BRD_CAP_CUT_ON, BRD_CAP_LAP, BRD_CAP_WALL, BRD_PORTAL_ON, SP_FR_W, BRD_SLIT_LINK,
} from './constants.js'
import { bridgeVaultSpec, buildSpireBand } from './bridgeVaultGeometry.js'
import { spireSpec, wellWallR, SPIRE_BODY_SEG } from './spireGeometry.js'
import { gatPlane } from './gatEaveGeometry.js'   // ★★★161 관 갓의 절단면 = 드럼 갓 평면(정본 하나)

//  ══ ★★★161 관 갓 = 드럼 천장 면 절단 (2026.08.21 현도 ⓐ) ══
//   ★평면이므로 계수를 **표본 셋**으로 뽑는다(근사가 아니라 정확 — 1차식의 유한차분은 오차 0).
//   ★컷 = 천장보다 `BRD_CEIL_LAP` **위**. 아래로 내려오지 않고(현도 요구), 천장 살과 공면도 아니다.
//  ★★★162 ⓑ: 벽(토막)도 같은 천장 면으로 자른다 — 갓만 자르면 벽이 캔틸레버로 튀어나온다(현도 실물 판정).
const CAP_SECS = new Set(BRD_CAP_WALL ? ['갓빗판', '갓마루', '토막위', '토막아래'] : ['갓빗판', '갓마루'])
let _capCoef = null
function capCoef() {
  if (_capCoef) return _capCoef
  const P = gatPlane()
  const c = P(0, 0), a = P(1, 0) - c, b = P(0, 1) - c
  _capCoef = { a, b, c }
  return _capCoef
}
//  높이 y · 폭 |z| 에서 **드럼 천장이 서는 x** (천장 평면을 x에 대해 푼 것)
export function drumCeilX(y, z) { const { a, b, c } = capCoef(); return (y - c - b * Math.abs(z)) / a }
//  관 갓의 동쪽 끝 x — 천장보다 lap 위에서 끊는다
//  ★★★162 ②: 유격 = `BRD_CAP_LAP`. **0이면 관이 천장 면에서 정확히 끝난다**(현도 "유격 0").
export function brdCapCutX(y, z) { return drumCeilX(y - BRD_CAP_LAP, z) }
//  ★부재별 동단 함수 — 빌더도 검사도 이것만 읽는다(★144 규칙 · 사본 금지)
export function trapSecEndX(secId) {
  return (BRD_CAP_CUT_ON && CAP_SECS.has(secId)) ? brdCapCutX : brdEndX
}
export function trapCapSecIds() { return [...CAP_SECS] }

function quadGeo(build) {
  const pos = [], idx = []
  const q = (a, b, c, d) => {
    const n = pos.length / 3
    for (const p of [a, b, c, d]) { pos.push(p[0], p[1], p[2]) }
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  //  ★156: 삼각형도 필요해졌다(오각 단면의 끝 캡 부채꼴) — 쿼드 어법은 그대로 두고 하나 더 낸다
  const tri = (a, b, c) => {
    const n = pos.length / 3
    for (const p of [a, b, c]) { pos.push(p[0], p[1], p[2]) }
    idx.push(n, n + 1, n + 2)
  }
  build(q, tri)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return orientOutward(g)
}

//  ── 단면 스펙: 부재마다 (z,y) 사각 단면 4점(시계·반시계 무관 — orientOutward가 잡는다) ──
//   선분 부재는 중심선 두 점 + 수직 두께로 사각을 만든다. ext0·ext1 = 끝 연장(침강 물림).
//  중심선 끝점을 그대로 실어 보낸다 — 검사가 노치 밴드(점-기울기 형식)와 **다른 형식으로** 대조한다.
function strip(p0, p1, t, ext0, ext1) {
  const dz = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dz, dy)
  const uz = dz / L, uy = dy / L, nz = -uy, ny = uz
  const a = [p0[0] - uz * ext0, p0[1] - uy * ext0]
  const b = [p1[0] + uz * ext1, p1[1] + uy * ext1]
  return [
    [a[0] + nz * t / 2, a[1] + ny * t / 2], [b[0] + nz * t / 2, b[1] + ny * t / 2],
    [b[0] - nz * t / 2, b[1] - ny * t / 2], [a[0] - nz * t / 2, a[1] - ny * t / 2],
  ]
}

export function bridgeTrapSpec() {
  const t = BRD_T, snk = SPIRE_SINK
  const secs = []            // { id, quad[4][2], mirror }  (mirror=true → z 반전 짝 자동)
  //  ① 스커트: 보행면 가장자리(5.15,127) → 접점(7.05,128.9). 밑끝 snk 연장 = 데크 살 속.
  secs.push({ id: '스커트', cl: [[BRD_HW, BRD_YW], [BRD_TRP_JZ, BRD_TRP_JY]], quad: strip([BRD_HW, BRD_YW], [BRD_TRP_JZ, BRD_TRP_JY], t, snk, 0), mirror: true })
  //  ② 빗면: 처마 끝(7.873,126.7) → 상단(2.15,142). 위끝 snk 연장 = 토막 살 속.
  secs.push({ id: '빗면', cl: [[BRD_TRP_TIPZ, BRD_TRP_TIPY], [BRD_TRP_O2, BRD_TRP_AY]], quad: strip([BRD_TRP_TIPZ, BRD_TRP_TIPY], [BRD_TRP_O2, BRD_TRP_AY], t, 0, snk), mirror: true })
  //  ③ 수직 토막 둘(슬릿 사이): z = ±O2 중심 · 두께 t. 아랫토막은 빗면과 겹치고 윗토막은 갓과 겹친다.
  secs.push({ id: '토막아래', cl: [[BRD_TRP_O2, BRD_TRP_AY], [BRD_TRP_O2, BRD_TRP_C0Y]], quad: strip([BRD_TRP_O2, BRD_TRP_AY], [BRD_TRP_O2, BRD_TRP_AY + BRD_TRP_STUB], t, snk / 2, 0), mirror: true })
  secs.push({
    id: '토막위',
    quad: strip([BRD_TRP_O2, BRD_TRP_AY + BRD_TRP_STUB + BRD_TRP_SLIT], [BRD_TRP_O2, BRD_TRP_C0Y], t, 0, 0), mirror: true,
  })
  //  ④ 갓 빗판: (2.65,145) → 마루단(1.55,147.941). 아래끝은 그대로(노출 소핏 = 처마 의도) · 위끝 snk = 마루판 살 속.
  secs.push({ id: '갓빗판', cl: [[BRD_TRP_C0Z, BRD_TRP_C0Y], [BRD_TRP_M / 2, BRD_TRP_CAPY]], quad: strip([BRD_TRP_C0Z, BRD_TRP_C0Y], [BRD_TRP_M / 2, BRD_TRP_CAPY], t, 0, snk), mirror: true })
  //  ⑤ 갓 마루판: 평평 · 양끝 snk 연장 = 빗판 살 속. (mirror 없음 — z 대칭 한 장)
  secs.push({
    id: '갓마루',
    quad: [
      [-BRD_TRP_M / 2 - snk, BRD_TRP_CAPY + t / 2], [BRD_TRP_M / 2 + snk, BRD_TRP_CAPY + t / 2],
      [BRD_TRP_M / 2 + snk, BRD_TRP_CAPY - t / 2], [-BRD_TRP_M / 2 - snk, BRD_TRP_CAPY - t / 2],
    ], mirror: false,
  })
  //  단면적(신발끈) — 부피 정확식용
  const area = (Q) => {
    let a = 0
    for (let i = 0; i < 4; i++) { const [z0, y0] = Q[i], [z1, y1] = Q[(i + 1) % 4]; a += z0 * y1 - z1 * y0 }
    return Math.abs(a) / 2
  }
  return {
    on: BRD_TRP_ON, x0: BRD_X0, x1: BRD_EAST_X, len: BRD_EAST_X - BRD_X0,
    secs, area,
    //  ★외피 z(y) — **단면 정본(secs)에서 직접** 잰다.
    //   ⛔자기 정정(2026.08.21): 초판은 구간별 손유도 사본이었고 처마 구간에서 최대 **2.836** 틀렸다
    //    (y127: 정본 8.428 vs 사본 5.592 — 스커트 식을 스커트가 없는 높이에 적용했다).
    //    그 값으로 "교차부 내부 최대 ±6.61"을 선언했으니 그 선언도 과소였다. 사본을 지우고 정본을 잰다.
    zOut: (y) => {
      let m = -Infinity
      for (const s of secs) for (const sg of (s.mirror ? [1, -1] : [1])) {
        const Q = s.quad.map(([z, yy]) => [sg * z, yy])
        for (let i = 0; i < 4; i++) {
          const [z0, y0] = Q[i], [z1, y1] = Q[(i + 1) % 4]
          if ((y0 - y) * (y1 - y) <= 0 && Math.abs(y1 - y0) > 1e-12) {
            const t2 = (y - y0) / (y1 - y0)
            m = Math.max(m, Math.abs(z0 + (z1 - z0) * t2))
          }
        }
      }
      //  ⚠슬릿 구간(142.825~144.175)에는 단면이 **없다** → 0(재료 없음). ⑰E가 이 구멍을 물어 드러냈다.
      return m === -Infinity ? 0 : m
    },
  }
}

//  ══ ★★★150-b 빗면 2단 액자 — 벽 평면 직교 좌표 (x, s, u)의 상자 패치 분할 ══
//   s = 접점 J에서 벽을 따라 오르는 거리 · u = **바깥면**에서 안으로 재는 깊이(u<0 = 바깥 돌출).
//   이 좌표계에서 모든 패치가 직교 상자 → 부피 = Δx·Δs·Δu **정확식**(검사가 전 패치를 합산 대조).
//   'in'   : 바깥면 전부 u=0(민짜) · 링 두께 t−d · 필드 t−2d (안쪽만 파임)
//   'stamp': 두께 전부 t · 링 u −d~t−d · 필드 −2d~t−2d (관통 복사 — 밖 돋움·안 파임)
export function trapPanelSpec() {
  const t = BRD_T, d = BRD_TRP_PNL_DP, mode = BRD_TRP_PNL
  const Ls = Math.hypot(BRD_TRP_JZ - BRD_TRP_O2, BRD_TRP_AY - BRD_TRP_JY)
  const sOfY = (y) => (y - BRD_TRP_JY) * Ls / (BRD_TRP_AY - BRD_TRP_JY)   // 연직 y → 벽면 s
  //  빗면 전체 s 범위(★150 원판과 동일: 처마 끝 ~ 토막 살 속 연장)
  const s0 = -BRD_TRP_D * Ls / (BRD_TRP_AY - BRD_TRP_JY)                  // −2.349 (처마)
  const s1 = Ls + SPIRE_SINK                                              // 14.486 (침강)
  //  패널 대역(현도: 연직 여백 2.2 · 틀 폭 1.10 — 연직·x 공통 측정)
  const py0 = BRD_TRP_JY + BRD_TRP_PNL_G, py1 = BRD_TRP_AY - BRD_TRP_PNL_G
  const sp0 = sOfY(py0), sp1 = sOfY(py1)
  const sf0 = sOfY(py0 + BRD_TRP_PNL_FW), sf1 = sOfY(py1 - BRD_TRP_PNL_FW)
  const bay = (BRD_EAST_X - BRD_X0) / BRD_TRP_PNL_N
  const pw = bay * BRD_TRP_PNL_R, fw = BRD_TRP_PNL_FW
  //  깊이 짝(모드별): [u0, u1]
  const U = mode === 'stamp'
    ? { full: [0, t], ring: [-d, t - d], field: [-2 * d, t - 2 * d] }
    : { full: [0, t], ring: [0, t - d], field: [0, t - 2 * d] }
  const patches = []                     // { x0,x1, s0,s1, u0,u1, zone }
  const P = (x0, x1, ss0, ss1, uu, zone) => patches.push({ x0, x1, s0: ss0, s1: ss1, u0: uu[0], u1: uu[1], zone })
  if (mode === 'off') {
    P(BRD_X0, BRD_EAST_X, s0, s1, U.full, 'full')
  } else {
    //  가로 긴 띠 둘(패널 대역 밖 — 전장 · 풀 두께)
    P(BRD_X0, BRD_EAST_X, s0, sp0, U.full, 'full')
    P(BRD_X0, BRD_EAST_X, sp1, s1, U.full, 'full')
    //  세로 살 N+1 + 패널(링 4 + 필드 1) × N
    for (let k = 0; k <= BRD_TRP_PNL_N; k++) {
      const gx0 = k === 0 ? BRD_X0 : BRD_X0 + k * bay - (bay - pw) / 2
      const gx1 = k === BRD_TRP_PNL_N ? BRD_EAST_X : BRD_X0 + k * bay + (bay - pw) / 2
      P(gx0, gx1, sp0, sp1, U.full, 'full')
    }
    for (let k = 0; k < BRD_TRP_PNL_N; k++) {
      const cx = BRD_X0 + k * bay + bay / 2
      const px0 = cx - pw / 2, px1 = cx + pw / 2
      P(px0, px1, sp0, sf0, U.ring, 'ring')                    // 아래 틀
      P(px0, px1, sf1, sp1, U.ring, 'ring')                    // 위 틀
      P(px0, px0 + fw, sf0, sf1, U.ring, 'ring')               // 왼 틀
      P(px1 - fw, px1, sf0, sf1, U.ring, 'ring')               // 오른 틀
      P(px0 + fw, px1 - fw, sf0, sf1, U.field, 'field')        // 필드
    }
  }
  return { mode, t, d, Ls, s0, s1, sp0, sp1, sf0, sf1, bay, pw, fw, patches, sOfY }
}

//  빗면 조립 빌더 — 패치(x,s,u 상자)를 월드로 사상해 닫힌 육면체로. 프레임: J + dir·s ± n·(t/2−u).
//  ⚠**orientOutward 금지**(★149 팬텀 계열 자기 적발 2호): 맞닿은 상자들을 좌표 용접이 한 성분으로
//   합쳐 방향을 뒤집는다(실측 74152 vs 5003). → 상자마다 면 법선·중심 내적으로 **빌더가 감김을 보증**.
//   내부 접면 중복은 상자 타일링의 구조적 성질 — 불가시(합집합 속) · 부호 부피는 정확히 상쇄.
function quadGeoRaw(build) {
  const pos = [], idx = []
  const q = (a, b, c, d2) => {
    const n = pos.length / 3
    for (const p of [a, b, c, d2]) pos.push(p[0], p[1], p[2])
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3)
  }
  const tri = (a, b, c) => {
    const n = pos.length / 3
    for (const p of [a, b, c]) pos.push(p[0], p[1], p[2])
    idx.push(n, n + 1, n + 2)
  }
  build(q, tri)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
export const SLOPE_DS = 1e9   // ⛔★159 되돌림: 뱃머리가 없으면 min() 꺾임도 없다 → 세분 불필요(삼각형 절감)
export function buildTrapSlope(PS = trapPanelSpec()) {
  const Ls = PS.Ls
  const dz = (BRD_TRP_O2 - BRD_TRP_JZ) / Ls, dy = (BRD_TRP_AY - BRD_TRP_JY) / Ls   // 벽 진행(위·안)
  const nz = dy, ny = -dz                                                          // 바깥 법선(+z 쪽 벽)
  //  ⚠긴 패치는 x≈4로 쪼갠다(정본 프로브 근평면 한계 — ★150 본체와 같은 이유). 상자별 닫힘·부피 불변.
  //  ★★★158: 패치의 동단도 **빗면 컷**을 받는다. (s,u) 모서리마다 월드 y가 달라 끝 x가 다르므로,
  //   x를 절대값이 아니라 **비율 t**로 쪼개고 모서리별 끝 x로 보간한다(프리즘과 같은 수법).
  const yOf = (sPar, u) => BRD_TRP_JY + dy * sPar + ny * (BRD_T / 2 - u)
  const zAbsOf = (sPar, u) => Math.abs(BRD_TRP_JZ + dz * sPar + nz * (BRD_T / 2 - u))
  const endOf = (sPar, u) => brdEndX(yOf(sPar, u), zAbsOf(sPar, u))
  //  ★158: 컷 꺾임(y=127)이 패치를 가로지르면 s 방향으로 먼저 쪼갠다(u 방향 잔차는 검사가 잰다)
  //  ★158: 컷 꺾임(y=127)이 패치를 **비스듬히** 가로지른다(y가 u에도 의존). u 양끝의 교차 s 둘로 쪼개
  //   꺾임을 한 얇은 띠 안에 가둔다 — 잔차가 그 띠의 두께로 갇힌다(검사가 잰다).
  const sCrossAt = (u) => (BRD_YW - BRD_TRP_JY - ny * (BRD_T / 2 - u)) / dy
  //  ★159: 빗면↔뱃머리 **교대선**도 패치를 가로지른다. 거기 분할이 없으면 min()이 현으로 잘려 톱니가 난다.
  //   145 − K(y−127) = X0 + (Z0 − |z|)/Kp  · y·z 모두 s에 선형 → s를 닫힌 식으로 푼다.
  const sCross2At = (u) => {
    const yb = BRD_TRP_JY + ny * (BRD_T / 2 - u), zb = Math.abs(BRD_TRP_JZ + nz * (BRD_T / 2 - u))
    const zs = (BRD_TRP_JZ + nz * (BRD_T / 2 - u)) >= 0 ? 1 : -1
    //  y = yb + dy·s · z = zb' + zs·dz·s  (|z| 부호는 그 대역에서 일정하다고 본다)
    const A1 = -BRD_END_K * dy                       // d(slant)/ds
    const B1 = BRD_EAST_X - BRD_END_K * (yb - BRD_YW)
    const A2 = -(zs * dz) / BRD_PROW_K               // d(prow)/ds
    const B2 = BRD_PROW_X0 + (BRD_PROW_Z0 - zb) / BRD_PROW_K
    if (Math.abs(A1 - A2) < 1e-12) return NaN
    return (B2 - B1) / (A1 - A2)
  }
  //  ★159: 끝 면이 두 장이라 min()이 패치 안에서 꺾인다. s를 촘촘히 쪼개 현 오차를 가둔다
  //   (검사도 **같은 밴드**를 쓴다 — ★144 규칙).
  const sub = []
  for (const p of PS.patches) {
    const cs = [sCrossAt(p.u0), sCrossAt(p.u1), sCross2At(p.u0), sCross2At(p.u1)]
      .filter(v => isFinite(v) && v > p.s0 + 1e-9 && v < p.s1 - 1e-9).sort((a, b) => a - b)
    const raw = []
    let s0 = p.s0
    for (const c of cs) { raw.push([s0, c]); s0 = c }
    raw.push([s0, p.s1])
    for (const [a, b] of raw) {
      const n2 = Math.max(1, Math.ceil((b - a) / SLOPE_DS))
      for (let i = 0; i < n2; i++) sub.push({ ...p, s0: a + (b - a) * i / n2, s1: a + (b - a) * (i + 1) / n2 })
    }
  }
  const chunks = []
  for (const p of sub) {
    const xeA = endOf(p.s0, p.u0), xeB = endOf(p.s1, p.u0)
    const xeC = endOf(p.s0, p.u1), xeD = endOf(p.s1, p.u1)
    const n = Math.max(1, Math.ceil((p.x1 - p.x0) / 4))   // 프로브 근평면 한계용 분할(★150)
    for (let i = 0; i < n; i++) chunks.push({ ...p, t0: i / n, t1: (i + 1) / n, xeA, xeB, xeC, xeD })
  }
  return quadGeoRaw((q) => {
    for (const side of [1, -1]) {
      for (const p of chunks) {
        const C = (x, sPar, u) => {
          const off = BRD_T / 2 - u
          return [x, BRD_TRP_JY + dy * sPar + ny * off, side * (BRD_TRP_JZ + dz * sPar + nz * off)]
        }
        //  모서리별 x = p.x0 → 그 모서리의 끝 x 를 t로 보간
        const XX = (xe, t) => p.x0 + (Math.min(p.x1, xe) - p.x0) * t
        const V = [
          C(XX(p.xeA, p.t0), p.s0, p.u0), C(XX(p.xeA, p.t1), p.s0, p.u0),
          C(XX(p.xeB, p.t1), p.s1, p.u0), C(XX(p.xeB, p.t0), p.s1, p.u0),
          C(XX(p.xeC, p.t0), p.s0, p.u1), C(XX(p.xeC, p.t1), p.s0, p.u1),
          C(XX(p.xeD, p.t1), p.s1, p.u1), C(XX(p.xeD, p.t0), p.s1, p.u1),
        ]
        const ctr = [0, 0, 0]
        for (const v of V) { ctr[0] += v[0] / 8; ctr[1] += v[1] / 8; ctr[2] += v[2] / 8 }
        //  각 면: 법선·(면중심−상자중심) 내적이 음이면 뒤집어 바깥 감김 보증(결정적 — 도구 불요)
        const F = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [3, 2, 6, 7], [0, 3, 7, 4], [1, 5, 6, 2]]
        for (const f of F) {
          const [a, b, c, d2] = f.map(i => V[i])
          const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
          const nrm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
          const fc = [(a[0] + b[0] + c[0] + d2[0]) / 4 - ctr[0], (a[1] + b[1] + c[1] + d2[1]) / 4 - ctr[1], (a[2] + b[2] + c[2] + d2[2]) / 4 - ctr[2]]
          const dot = nrm[0] * fc[0] + nrm[1] * fc[1] + nrm[2] * fc[2]
          dot >= 0 ? q(a, b, c, d2) : q(a, d2, c, b)
        }
      }
    }
  })
}

//  ══ ★★★151 서단 면추종 절단 — 첨탑 외피 다각형을 그대로 읽는다 ══
//   ★첨탑은 회전체가 아니라 **다각 기둥**: y ≤ y1은 96각(az0=0), 그 위는 8각 뿔대(모서리 az=0).
//    원으로 근사하면 96각 구간은 최대 0.012, 8각 구간은 **1.37**까지 어긋난다(내접·외접 차) — 근사 금지.
//   주어진 (y, z)에서 그 다각형 경계의 x를 **현의 선형 보간**으로 정확히 돌려준다.
//   ⚠**경계 y1의 모호성**: y=138.02 정확히에서 96각인지 8각인지가 부등호에 달려 있고, 그 차가 1.3이다.
//    조각 단위로 `nHint`를 명시해 한 조각 안에서는 **같은 다각형**만 쓰게 한다(현 오차 0.61의 근인이었다).
export function spireCutX(y, z, S = spireSpec(), nHint = 0) {
  const R = wellWallR(y, { spec: S, forceSpire: true })      // 그 높이의 **외접**반경(lathe가 쓰는 그 값)
  const N = nHint || (y <= S.y1 ? SPIRE_BODY_SEG : 8)        // 96각 → 8각(팔각 뿔대 시작)
  const az0 = N === 8 ? S.cornerAz0 : 0
  const za = Math.abs(z), step = 2 * Math.PI / N
  //  az0에서 출발해 z가 걸치는 현을 찾는다(관 폭 ±7.62 → 방위 20° 이내이므로 몇 칸이면 끝난다)
  for (let k = 0; k < N; k++) {
    const a0 = az0 + k * step, a1 = az0 + (k + 1) * step
    const z0 = R * Math.sin(a0), z1 = R * Math.sin(a1)
    if (za >= Math.min(z0, z1) - 1e-12 && za <= Math.max(z0, z1) + 1e-12) {
      const t = Math.abs(z1 - z0) < 1e-12 ? 0 : (za - z0) / (z1 - z0)
      return R * Math.cos(a0) + t * (R * Math.cos(a1) - R * Math.cos(a0))
    }
  }
  return NaN                                                 // 관이 첨탑보다 넓다 = 설계 오류(검사가 잡는다)
}

//  서단 연장체: 단면 하나를 절단면 ~ (BRD_X0 + 침강)까지 늘린 솔리드.
//   단면을 (u,v) 격자로 쪼개 **격자점마다 절단면 x를 직접 평가**한다(면추종 — 평면 근사 아님).
//   격자를 다각형 꼭짓점보다 촘촘히 두면 오차는 한 칸 폭으로 갇힌다(검사가 편차를 실측).
export const WCUT_NU = 40, WCUT_NV = 4
//  ★첨탑 외피의 **불연속 높이**에 격자선을 맞춘다. y1(138.02)에서 96각 → 8각으로 바뀌며 외피가
//   꺾이고(턱), yTop0(134.92)에서 곧은 벽 → 위 빗면으로 기울기가 바뀐다. 칸이 그 선을 가로지르면
//   현 오차가 0.67까지 튄다(스윕 실측). 단면 사각을 그 높이에서 **미리 쪼개면** 경계가 곧 그 선이 된다.
//   ⚠쪼갠 경계 A–B는 두 긴 변 위의 같은 높이 점이라 **정확히 수평** — 이웃 조각과 변을 공유해 틈이 없다.
function splitQuadAtY(Q, levels) {
  let pieces = [Q]
  for (const Y of levels) {
    const next = []
    for (const q of pieces) {
      const ys = q.map(p => p[1])
      if (Y <= Math.min(...ys) + 1e-9 || Y >= Math.max(...ys) - 1e-9) { next.push(q); continue }
      //  긴 변 = 0→1(바깥)과 3→2(안). 그 위의 y=Y 점을 찾는다.
      const cut = (a, b) => {
        const t = (Y - a[1]) / (b[1] - a[1])
        return [a[0] + (b[0] - a[0]) * t, Y]
      }
      const okA = (q[0][1] - Y) * (q[1][1] - Y) < 0, okB = (q[3][1] - Y) * (q[2][1] - Y) < 0
      if (!okA || !okB) { next.push(q); continue }      // 짧은 변을 지나는 경우 = 쪼개지 않는다
      const A = cut(q[0], q[1]), B = cut(q[3], q[2])
      next.push([q[0], A, B, q[3]], [A, q[1], q[2], B])
    }
    pieces = next
  }
  return pieces
}
//  빌더와 검사가 **같은 조각 목록**을 읽는다(★144 규칙 — 사본 금지)
export function trapWestPieces(A = bridgeTrapSpec()) {
  const S = spireSpec(), lv = [S.yTop0, S.y1], out = []
  //  조각의 대표 다각형 = **무게중심 y**로 결정(경계에 걸친 꼭짓점의 부등호에 좌우되지 않는다)
  const tag = (q) => { const yc = q.reduce((a, p) => a + p[1], 0) / 4; return yc <= S.y1 ? SPIRE_BODY_SEG : 8 }
  for (const s of A.secs) {
    for (const pc of splitQuadAtY(s.quad, lv)) out.push({ q: pc, n: tag(pc), id: s.id })
    if (s.mirror) for (const pc of splitQuadAtY(s.quad.map(([z, y]) => [-z, y]), lv)) out.push({ q: pc, n: tag(pc), id: s.id })
  }
  return out
}

export function buildTrapWestCap(A = bridgeTrapSpec()) {
  if (!BRD_WCUT || !BRD_TRP_ON) return null
  const S = spireSpec(), xE = BRD_X0 + SPIRE_SINK
  const pieces = trapWestPieces(A)
  const out = []
  for (const s of A.secs) {
    const geo = quadGeo((q) => {
      const put = (Q, nH) => {
        //  Q = 단면 사각 4점 [z,y] — 이중선형으로 (u,v) 격자
        const C = (u, v) => {
          const a = [Q[0][0] + (Q[1][0] - Q[0][0]) * u, Q[0][1] + (Q[1][1] - Q[0][1]) * u]
          const b = [Q[3][0] + (Q[2][0] - Q[3][0]) * u, Q[3][1] + (Q[2][1] - Q[3][1]) * u]
          return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v]
        }
        const W = (u, v) => { const [z, y] = C(u, v); return [spireCutX(y, z, S, nH), y, z] }
        const E = (u, v) => { const [z, y] = C(u, v); return [xE, y, z] }
        //  ① 서 캡(면추종 격자)
        for (let i = 0; i < WCUT_NU; i++) for (let j = 0; j < WCUT_NV; j++) {
          const u0 = i / WCUT_NU, u1 = (i + 1) / WCUT_NU, v0 = j / WCUT_NV, v1 = (j + 1) / WCUT_NV
          q(W(u0, v0), W(u0, v1), W(u1, v1), W(u1, v0))
        }
        //  ② 동 캡(평면 — 본체 살 속으로 침강)
        for (let i = 0; i < WCUT_NU; i++) for (let j = 0; j < WCUT_NV; j++) {
          const u0 = i / WCUT_NU, u1 = (i + 1) / WCUT_NU, v0 = j / WCUT_NV, v1 = (j + 1) / WCUT_NV
          q(E(u0, v0), E(u1, v0), E(u1, v1), E(u0, v1))
        }
        //  ③ 옆면 넷 — 격자 경계를 그대로 따라 닫는다(T-접합 없음)
        const edges = [
          { n: WCUT_NU, f: (i) => [i / WCUT_NU, 0], rev: false },
          { n: WCUT_NU, f: (i) => [i / WCUT_NU, 1], rev: true },
          { n: WCUT_NV, f: (j) => [0, j / WCUT_NV], rev: true },
          { n: WCUT_NV, f: (j) => [1, j / WCUT_NV], rev: false },
        ]
        for (const e of edges) {
          for (let i = 0; i < e.n; i++) {
            const [ua, va] = e.f(i), [ub, vb] = e.f(i + 1)
            const a0 = W(ua, va), b0 = W(ub, vb), a1 = E(ua, va), b1 = E(ub, vb)
            e.rev ? q(a0, a1, b1, b0) : q(a0, b0, b1, a1)
          }
        }
      }
      for (const pc of pieces) if (pc.id === s.id) put(pc.q, pc.n)
    })
    out.push({ id: '서단' + s.id, geo })
  }
  return out
}


//  ══ ★★★155 관 내부 기둥 — 벽 추종(두 각도) · 벽 살 관통 ══
//   ★한 토막의 단면 = 벽 중심선을 **안으로 D/2 옮기고** 두께 (t + D)로 잡은 띠.
//    그러면 u 대역이 [−t/2, t/2 + D] — 바깥면이 벽 바깥면과 정확히 공면이고 안으로만 D 나온다(현도 ⓙ).
//   ★자리 = 살 한복판(패널 두 개당 하나). 홀수 k만 뽑아야 양 끝 여백이 대칭이다(N 짝수일 때 성립).
//  ══ ★★★157 기둥 = 도면 트레이스 — 벽 안쪽면 리브 + 슬릿 마개 ══
export function trapColumnSpec(A = bridgeTrapSpec()) {
  const W = BRD_COL_W, R = BRD_COL_SECT === 'rect' ? 1 : BRD_COL_R
  const bay = (BRD_EAST_X - BRD_X0) / BRD_TRP_PNL_N
  const xs = []
  for (let k = 1; k < BRD_TRP_PNL_N; k += 2) xs.push(BRD_X0 + k * bay)
  //  ① 벽 **안쪽** 경계 — 단면 정본에서 직접(손유도 사본 금지, ★152 자기 정정의 교훈)
  const innerWallZ = (y) => {
    let m = Infinity
    for (const s of A.secs) {
      if (Math.min(...s.quad.map(p => p[0])) <= 0) continue     // 갓마루(z=0 걸침) 제외
      let lo = Infinity, hit = false
      for (let i = 0; i < 4; i++) {
        const [z0, y0] = s.quad[i], [z1, y1] = s.quad[(i + 1) % 4]
        if ((y0 - y) * (y1 - y) <= 0 && Math.abs(y1 - y0) > 1e-12) {
          const t = (y - y0) / (y1 - y0); lo = Math.min(lo, z0 + (z1 - z0) * t); hit = true
        }
      }
      if (hit) m = Math.min(m, lo)
    }
    return m
  }
  //  ② 안쪽 면 = 손그림 곡선. Catmull-Rom(제어점을 정확히 지난다).
  //   ⚠제어점 사이에서 최대 0.0092 과주한다(y131.8) — 그 높이 벽 여유 1.55라 무해(선언).
  const P = BRD_COL_CURVE
  const curveZ = (y) => {
    if (y <= P[0][1]) return P[0][0]
    if (y >= P[P.length - 1][1]) return P[P.length - 1][0]
    let i = 0
    while (i + 1 < P.length && P[i + 1][1] < y) i++
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[Math.min(P.length - 1, i + 1)], p3 = P[Math.min(P.length - 1, i + 2)]
    const t = (y - p1[1]) / (p2[1] - p1[1]), t2 = t * t, t3 = t2 * t
    return 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
      + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
  }
  //  ③ 몸통 끝 — 벽 안쪽면의 **불연속 직전**(y141.75에서 빗면 1.577 → 토막 1.525로 턱이 진다).
  //   그 점에서 끊으면 두께가 0이 되어 단면이 퇴화한다. TH0만큼 앞에서 끝낸다(마감 두께 0.057 = 불가시).
  const th = (y) => innerWallZ(y) - curveZ(y)
  const yTop = P[P.length - 2][1] - BRD_COL_TH0
  //  ④ 슬릿 마개 — 그 높이엔 벽이 없으므로 **벽 두께 전체**를 메운다
  const slit = { y0: BRD_TRP_AY + BRD_TRP_STUB, y1: BRD_TRP_AY + BRD_TRP_STUB + BRD_TRP_SLIT,
                 zOut: BRD_TRP_O2 + BRD_T / 2, zIn: BRD_TRP_O2 - BRD_T / 2 }
  //  스테이션: 균등 + 꺾임(벽 관절 JY) + 곡선 제어점 — ★151·152·156에서 세 번 배운 규율
  const NS = 44, ss = []
  for (let i = 0; i <= NS; i++) ss.push(P[0][1] + (yTop - P[0][1]) * i / NS)
  ss.push(BRD_TRP_JY)
  for (const [, yy] of P) if (yy > P[0][1] && yy < yTop) ss.push(yy)
  ss.sort((a2, b2) => a2 - b2)
  for (let i = ss.length - 1; i > 0; i--) if (ss[i] - ss[i - 1] < 1e-9) ss.splice(i, 1)
  //  단면적(x-z 평면) = 사다리꼴: (W + W·R)/2 × 두께
  const areaAt = (y) => (W * (1 + R) / 2) * Math.max(0, th(y))
  return { on: BRD_COL_ON, xs, w: W, r: R, sect: BRD_COL_SECT, curve: P,
           innerWallZ, curveZ, th, yTop, y0: P[0][1], slit, stations: ss, areaAt, bay,
           gap: bay - bay * BRD_TRP_PNL_R }
}

export function buildTrapColumns(A = bridgeTrapSpec()) {
  if (!BRD_COL_ON || !BRD_TRP_ON) return null
  const K = trapColumnSpec(A)
  const out = []
  //  단면(x,z) 사각 네 점: 벽 쪽 폭 W · 안쪽 폭 W·R
  const quadAt = (xc, zOut, zIn) => {
    const a = K.w / 2, b = K.w * K.r / 2
    return [[xc - a, zOut], [xc + a, zOut], [xc + b, zIn], [xc - b, zIn]]
  }
  const loft = (id, ys, zOf) => {
    const geo = quadGeo((q, tri) => {
      for (const side of [1, -1]) for (const xc of K.xs) {
        const sec = (y) => { const [zo, zi] = zOf(y); return quadAt(xc, zo, zi).map(([x, z]) => [x, y, side * z]) }
        for (let i = 0; i + 1 < ys.length; i++) {
          const c0 = sec(ys[i]), c1 = sec(ys[i + 1])
          for (let k = 0; k < 4; k++) {
            const j = (k + 1) % 4
            side > 0 ? q(c0[k], c0[j], c1[j], c1[k]) : q(c0[k], c1[k], c1[j], c0[j])
          }
        }
        const b0 = sec(ys[0]), b1 = sec(ys[ys.length - 1])
        side > 0 ? q(b0[0], b0[3], b0[2], b0[1]) : q(b0[0], b0[1], b0[2], b0[3])
        side > 0 ? q(b1[0], b1[1], b1[2], b1[3]) : q(b1[0], b1[3], b1[2], b1[1])
      }
    })
    out.push({ id, geo })
  }
  loft('기둥몸', K.stations, (y) => [K.innerWallZ(y), K.curveZ(y)])
  loft('슬릿마개', [K.slit.y0, K.slit.y1], () => [K.slit.zOut, K.slit.zIn])
  return out
}


//  ★★★158: 동단 컷 면은 y=127(클램프)과 y=142.825(빗면→수직)에서 **꺾인다**.
//   단면을 그 높이에서 미리 쪼개야 메시가 꺾임을 현으로 가로지르지 않는다(★151·152·156·157에 이은 다섯 번째).
function clipPolyY(poly, Y, keepBelow) {
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const ia = keepBelow ? a[1] <= Y : a[1] >= Y
    const ib = keepBelow ? b[1] <= Y : b[1] >= Y
    if (ia) out.push(a)
    if (ia !== ib) { const t = (Y - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, Y]) }
  }
  return out
}
function polyArea(p) {
  let a = 0
  for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]; a += x0 * y1 - x1 * y0 }
  return Math.abs(a) / 2
}
//  일반 직선 g(z,y) ≥ 0 로 자르기 — ★159 교대선은 수평선이 아니다
function clipPolyG(poly, g, keepPos) {
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const ga = keepPos ? g(a) : -g(a), gb = keepPos ? g(b) : -g(b)
    if (ga >= 0) out.push(a)
    if ((ga >= 0) !== (gb >= 0)) {
      const t = ga / (ga - gb)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}
//  ★★★159: 끝 면이 두 장(빗면 · 뱃머리)이라 **교대선**에서도 쪼개야 한다.
//   교대선은 |z| = brdCrossZ(y) — y에 선형인 **기울어진** 직선이라 수평 클립으로는 못 자른다.
function splitAtKinks(poly) {
  let pieces = [poly]
  //  ⛔**꺾임 규율 일곱 번째(★161)**: 갓 컷은 `|z|`에 의존하므로 **z=0에서 꺾인다**.
  //   `갓마루`는 z −2.05~+2.05를 한 장으로 덮어 그 꺾임을 품는다 — 안 쪼개면 메시가 현으로 가로질러
  //   부피가 2.02 어긋난다(실측). 검사의 정확식도 같은 자리에서 쪼갠다(★144 규칙).
  if (BRD_CAP_CUT_ON) {
    const nx = []
    for (const pc of pieces)
      for (const c of [clipPolyG(pc, p => p[0], true), clipPolyG(pc, p => p[0], false)])
        if (c.length >= 3 && polyArea(c) > 1e-9) nx.push(c)
    pieces = nx
  }
  for (const Y of [BRD_YW]) {                       // ★159: 수직 컷 폐지로 142.825 꺾임은 사라졌다
    const nx = []
    for (const pc of pieces)
      for (const c of [clipPolyY(pc, Y, true), clipPolyY(pc, Y, false)])
        if (c.length >= 3 && polyArea(c) > 1e-9) nx.push(c)
    pieces = nx
  }
  if (BRD_PROW_ON) {
    const nx = []
    for (const pc of pieces) {
      const sg = pc.reduce((a, p) => a + p[0], 0) >= 0 ? 1 : -1
      const g = (p) => sg * p[0] - brdCrossZ(p[1])   // >0 이면 뱃머리가 자른다
      for (const c of [clipPolyG(pc, g, true), clipPolyG(pc, g, false)])
        if (c.length >= 3 && polyArea(c) > 1e-9) nx.push(c)
    }
    pieces = nx
  }
  return pieces
}

//  ══ ★★★158 동단 빗면 마개 — 빗면 아래를 닫는 판. 그 위는 열려 빛이 든다 ══
export function trapEndSpec(A = bridgeTrapSpec()) {
  const lap = BRD_CEIL_LAP
  //  관 **안쪽** 경계 — 단면 정본에서 직접(★157 기둥과 같은 정의 · 손유도 사본 금지)
  const innerZ = (y) => {
    let m = Infinity
    for (const s of A.secs) {
      if (Math.min(...s.quad.map(p => p[0])) <= 0) continue
      let lo = Infinity, hit = false
      for (let i = 0; i < 4; i++) {
        const [z0, y0] = s.quad[i], [z1, y1] = s.quad[(i + 1) % 4]
        if ((y0 - y) * (y1 - y) <= 0 && Math.abs(y1 - y0) > 1e-12) {
          const t = (y - y0) / (y1 - y0); lo = Math.min(lo, z0 + (z1 - z0) * t); hit = true
        }
      }
      if (hit) m = Math.min(m, lo)
    }
    return m
  }
  //  판이 덮는 z 반폭 — 잘린 변이 벽 살 속에서 끝난다(lap = ★152 노치 밴드와 같은 어법)
  const zAt = (y) => (y <= BRD_YW ? BRD_HW - lap : innerZ(y) + lap)
  //  판 두께의 **수평** 성분 — 빗면이 눕는 만큼 커진다(연직 두께 1.25가 아니다)
  const th = BRD_T * Math.hypot(1, BRD_END_K)
  const y0 = BRD_DECK_BOT + lap, y1 = BRD_END_Y1
  const ss = []
  const NS = 28
  for (let i = 0; i <= NS; i++) ss.push(y0 + (y1 - y0) * i / NS)
  ss.push(BRD_YW, BRD_TRP_JY)                       // 데크 상면·벽 관절 = 꺾임(★151·152·156·157의 규율)
  ss.sort((a, b) => a - b)
  for (let i = ss.length - 1; i > 0; i--) if (ss[i] - ss[i - 1] < 1e-9) ss.splice(i, 1)
  const areaAt = (y) => 2 * zAt(y) * th
  return { on: BRD_END_ON, y0, y1, zAt, th, stations: ss, areaAt, innerZ,
           angle: Math.atan(1 / BRD_END_K) * 180 / Math.PI }
}

export const ENDCAP_NZ = 24
//  ★★★159 마개 — 끝 면이 두 장(빗면·뱃머리)이라 판을 **셀 타일링**으로 짓는다.
//   셀마다 어느 면이 자르는지(중심으로 판정)에 따라 수평 두께가 달라진다:
//    빗면 t·√(1+K²) = 1.304 · 뱃머리 t·√(1+Kp²)/Kp = 2.242.
//   ⚠셀 타일링이라 내부 접면이 중복된다 → quadGeoRaw + 셀별 감김 자기 보증(에지 감사는 면제,
//    부피 정확식이 대신 잠근다 — ★150-b 빗면과 같은 처방).
export function endCapCells(A = bridgeTrapSpec()) {
  const E = trapEndSpec(A)
  const thSlant = BRD_T * Math.hypot(1, BRD_END_K)
  const thProw = BRD_T * Math.hypot(1, BRD_PROW_K) / BRD_PROW_K
  const cells = []
  const ys = E.stations
  for (let i = 0; i + 1 < ys.length; i++) {
    const y0 = ys[i], y1 = ys[i + 1], ym = (y0 + y1) / 2
    for (let j = 0; j < ENDCAP_NZ; j++) {
      const v0 = -1 + 2 * j / ENDCAP_NZ, v1 = -1 + 2 * (j + 1) / ENDCAP_NZ
      const vm = (v0 + v1) / 2
      const zm = vm * E.zAt(ym)
      const th = brdProwX(zm) < brdSlantX(ym) ? thProw : thSlant
      cells.push({ y0, y1, v0, v1, th, zAt0: E.zAt(y0), zAt1: E.zAt(y1) })
    }
  }
  return { cells, thSlant, thProw, E }
}

export function buildTrapEndCap(A = bridgeTrapSpec()) {
  if (!BRD_END_ON || !BRD_TRP_ON) return null
  const { cells } = endCapCells(A)
  const geo = quadGeoRaw((q) => {
    for (const c of cells) {
      const pt = (y, v, zAt, west) => {
        const z = v * zAt, xe = brdEndX(y, z)
        return [west ? xe - c.th : xe, y, z]
      }
      const V = [
        pt(c.y0, c.v0, c.zAt0, true), pt(c.y0, c.v0, c.zAt0, false),
        pt(c.y0, c.v1, c.zAt0, false), pt(c.y0, c.v1, c.zAt0, true),
        pt(c.y1, c.v0, c.zAt1, true), pt(c.y1, c.v0, c.zAt1, false),
        pt(c.y1, c.v1, c.zAt1, false), pt(c.y1, c.v1, c.zAt1, true),
      ]
      const ctr = [0, 0, 0]
      for (const v of V) for (let k = 0; k < 3; k++) ctr[k] += v[k] / 8
      const F = [[0, 1, 2, 3], [4, 7, 6, 5], [0, 4, 5, 1], [3, 2, 6, 7], [0, 3, 7, 4], [1, 5, 6, 2]]
      for (const f of F) {
        const [a2, b2, c2, d2] = f.map(i => V[i])
        const e1 = [b2[0] - a2[0], b2[1] - a2[1], b2[2] - a2[2]], e2 = [c2[0] - a2[0], c2[1] - a2[1], c2[2] - a2[2]]
        const nr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
        const fc = [(a2[0] + b2[0] + c2[0] + d2[0]) / 4 - ctr[0], (a2[1] + b2[1] + c2[1] + d2[1]) / 4 - ctr[1], (a2[2] + b2[2] + c2[2] + d2[2]) / 4 - ctr[2]]
        const dp = nr[0] * fc[0] + nr[1] * fc[1] + nr[2] * fc[2]
        dp >= 0 ? q(a2, b2, c2, d2) : q(a2, d2, c2, b2)
      }
    }
  })
  return { id: '동단마개', geo }
}

//  ══ ★★★165 빛구멍 문틀 — 문설주 둘 + 상인방 (문지방 = ★158 마개 윗면) ══
export function portalSpec(E = trapEndSpec()) {
  const d = BRD_T                                   // x 깊이
  const xc = BRD_END_X1 - E.th / 2                  // 마개 윗면 중심 139.648
  const x0 = xc - d / 2, x1 = xc + d / 2            // 139.023 ~ 140.273 ⊂ 마개 윗면(138.996~140.300)
  const zOut = BRD_TRP_O2                           // 문설주 바깥면 = 마개 꼭대기 반폭 2.15(항등)
  const zIn = zOut - SP_FR_W                        // 1.05
  const yFoot = E.y1                                // 142.825 — 마개 윗면 맞대기(★157 전례)
  const { a, b, c } = capCoef()                     // 드럼 갓 평면(정본 하나)
  const ceilY = (x, z) => c + a * x + b * Math.abs(z)
  //  ⛔침강 물림을 그대로 두면 동쪽 윗귀가 마루 상면(148.566)을 0.46 뚫는다(실측 149.03).
  //   → 마루판 **중심**(BRD_TRP_CAPY 147.941)으로 클램프 — 살 한복판에 묻힌다(파생 · 손 수치 0).
  //   두 면(천장+SINK · 수평 CAPY) 다 평면이라 교선은 **직선** — 꺾임 규율대로 그 선에서 쪼갠다.
  const lintTop = (x, z) => Math.min(ceilY(x, z) + SPIRE_SINK, BRD_TRP_CAPY)
  const lintBot = (x, z) => ceilY(x, z) - SP_FR_W         // 보이는 띠 1.10
  //  문설주 머리 = 발밑 상인방 아랫면의 최저 코너 + SPIRE_SINK 물림
  let head = Infinity
  for (const x of [x0, x1]) for (const z of [zIn, zOut]) head = Math.min(head, lintBot(x, z))
  head += SPIRE_SINK
  return { on: BRD_PORTAL_ON && BRD_END_ON && BRD_TRP_ON,
           d, xc, x0, x1, zOut, zIn, yFoot, head, ceilY, lintTop, lintBot,
           postH: head - yFoot,
           lintVol: (SP_FR_W + SPIRE_SINK) * (2 * zOut) * d,      // 오프셋 띠 = 넓이 불변 정확식
           postVol: SP_FR_W * d * (head - yFoot) }
}
//  ══ ★★★166 ⓑ 슬릿 잇기 — 슬릿마개 동단 ↔ 문설주 서면 (현도 ⓐ: 슬릿 폭 그대로) ══
//   ⚠단차 0.625가 이음매에 남는다(슬릿 1.525~2.775 vs 문설주 1.050~2.150) — 현도가 수치를 보고 선택.
export function slitLinkSpec(C0 = trapColumnSpec(), S = portalSpec()) {
  const x0 = C0.xs[C0.xs.length - 1] + C0.w / 2   // 슬릿마개 동단 = 마지막 기둥 중심 + 폭 절반(항등)
  //  ★★★167: 문틀이 소등되면 잇기는 **동단 x145까지** 간다 — 현도 "정면부만 창문"(옆면 구멍 0).
  //  ⚠상한은 **관 상부가 실제로 끝나는 x**를 따른다 — 체제 조합이 어긋나면 보존계 스윕이 문다.
  const x1 = BRD_PORTAL_ON ? S.x0 : brdEndX(C0.slit.y0 + 1e-6)
  return { on: BRD_SLIT_LINK && BRD_COL_ON,
           x0, x1, y0: C0.slit.y0, y1: C0.slit.y1, zIn: C0.slit.zIn, zOut: C0.slit.zOut,
           len: x1 - x0,
           vol: (x1 - x0) * (C0.slit.y1 - C0.slit.y0) * (C0.slit.zOut - C0.slit.zIn) * 2 }
}
export function buildSlitLink(L = slitLinkSpec()) {
  if (!L.on || L.len <= 1e-9) return []
  const out = []
  for (const sgn of [1, -1]) {
    const za = sgn > 0 ? L.zIn : -L.zOut, zb = sgn > 0 ? L.zOut : -L.zIn
    const V = [[L.x0,L.y0,za],[L.x1,L.y0,za],[L.x1,L.y0,zb],[L.x0,L.y0,zb],
               [L.x0,L.y1,za],[L.x1,L.y1,za],[L.x1,L.y1,zb],[L.x0,L.y1,zb]]
    const F = [[0,1,2,3],[7,6,5,4],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]
    const ctr = [0,0,0]; for (const v of V) for (let k=0;k<3;k++) ctr[k]+=v[k]/8
    const tris = []
    for (const f of F) for (let j=1;j+1<f.length;j++) {
      let [pA,pB,pC] = [V[f[0]],V[f[j]],V[f[j+1]]]
      const e1=[pB[0]-pA[0],pB[1]-pA[1],pB[2]-pA[2]], e2=[pC[0]-pA[0],pC[1]-pA[1],pC[2]-pA[2]]
      const nr=[e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]]
      const fc=[(pA[0]+pB[0]+pC[0])/3-ctr[0], (pA[1]+pB[1]+pC[1])/3-ctr[1], (pA[2]+pB[2]+pC[2])/3-ctr[2]]
      if (nr[0]*fc[0]+nr[1]*fc[1]+nr[2]*fc[2] < 0) [pB,pC] = [pC,pB]
      tris.push(pA,pB,pC)
    }
    const pos = new Float32Array(tris.length*3); tris.forEach((v,i)=>pos.set(v,i*3))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos,3)); g.computeVertexNormals()
    out.push({ id: sgn > 0 ? '슬릿잇기북' : '슬릿잇기남', geo: g })
  }
  return out
}

export function buildTrapPortal(S = portalSpec()) {
  if (!S.on) return []
  const parts = []
  const solid = (id, V, F) => {
    const ctr = [0, 0, 0]
    for (const v of V) for (let k = 0; k < 3; k++) ctr[k] += v[k] / V.length
    const tris = []
    for (const f of F) for (let j = 1; j + 1 < f.length; j++) {
      let [pA, pB, pC] = [V[f[0]], V[f[j]], V[f[j + 1]]]
      const e1 = [pB[0]-pA[0], pB[1]-pA[1], pB[2]-pA[2]], e2 = [pC[0]-pA[0], pC[1]-pA[1], pC[2]-pA[2]]
      const nr = [e1[1]*e2[2]-e1[2]*e2[1], e1[2]*e2[0]-e1[0]*e2[2], e1[0]*e2[1]-e1[1]*e2[0]]
      const fc = [(pA[0]+pB[0]+pC[0])/3-ctr[0], (pA[1]+pB[1]+pC[1])/3-ctr[1], (pA[2]+pB[2]+pC[2])/3-ctr[2]]
      if (nr[0]*fc[0]+nr[1]*fc[1]+nr[2]*fc[2] < 0) [pB, pC] = [pC, pB]
      tris.push(pA, pB, pC)
    }
    const pos = new Float32Array(tris.length * 3)
    tris.forEach((v, i) => pos.set(v, i * 3))
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.computeVertexNormals()
    parts.push({ id, geo: g })
  }
  const BOXF = [[0,1,2,3],[7,6,5,4],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]]
  for (const sgn of [1, -1]) {                       // 문설주 좌우(거울)
    const za = sgn > 0 ? S.zIn : -S.zOut, zb = sgn > 0 ? S.zOut : -S.zIn
    const V = [[S.x0,S.yFoot,za],[S.x1,S.yFoot,za],[S.x1,S.yFoot,zb],[S.x0,S.yFoot,zb],
               [S.x0,S.head,za],[S.x1,S.head,za],[S.x1,S.head,zb],[S.x0,S.head,zb]]
    solid(sgn > 0 ? '문설주북' : '문설주남', V, BOXF)
  }
  {                                                  // 상인방 — 용마루 꺾임을 z=0 정점으로 품는 닫힌 프리즘
    //  ★클램프 경계 xcl(z) = 「천장+SINK = CAPY」인 x — z에 선형(평면∩평면 = 직선 · 꺾임 규율)
    const CF = capCoef()
    const xcl = (z) => (BRD_TRP_CAPY - SPIRE_SINK - CF.c - CF.b * Math.abs(z)) / CF.a
    const zPairs = [[-S.zOut, 0], [0, S.zOut]]       // 용마루 꺾임(z=0) 분할
    let li = 0
    for (const [za, zb] of zPairs) {
      const xa = Math.min(xcl(za), xcl(zb)), xb = Math.max(xcl(za), xcl(zb))
      const xs = [S.x0]
      if (xa > S.x0 + 1e-9 && xa < S.x1 - 1e-9) xs.push(xa)
      if (xb > S.x0 + 1e-9 && xb < S.x1 - 1e-9 && xb - xa > 1e-9) xs.push(xb)
      xs.push(S.x1)
      for (let i = 0; i + 1 < xs.length; i++) {
        const [xA, xB] = [xs[i], xs[i + 1]]
        const diag = xB - xA > 1e-9 && Math.abs(xA - xa) < 1e-9 && Math.abs(xB - xb) < 1e-9 && xb - xa > 1e-9
        if (!diag) {
          //  경계 밖 구간 — 윗면이 단일 평면(클램프 한쪽만) → 닫힌 상자 프리즘
          const V = []
          for (const x of [xA, xB]) for (const z of [za, zb])
            V.push([x, S.lintBot(x, z), z], [x, S.lintTop(x, z), z])
          solid(`상인방${++li}`, V, [[0,1,3,2],[4,6,7,5],[0,2,6,4],[1,5,7,3],[0,4,5,1],[2,3,7,6]])
          continue
        }
        //  ★경계가 대각으로 지나는 구간 — 꺾임 직선을 **변으로 갖는 삼각 프리즘 둘**.
        //   삼각형 안에서는 min()의 승자가 하나뿐이라 정점별 min 값이 자동으로 한 평면이다.
        const K1 = [xcl(za), za], K2 = [xcl(zb), zb]              // 꺾임 대각선의 두 끝(모서리)
        const corners = [[xA, za], [xB, za], [xB, zb], [xA, zb]]
        const onK = (P2) => (Math.abs(P2[0] - K1[0]) < 1e-9 && Math.abs(P2[1] - K1[1]) < 1e-9) ||
                            (Math.abs(P2[0] - K2[0]) < 1e-9 && Math.abs(P2[1] - K2[1]) < 1e-9)
        const others = corners.filter(P2 => !onK(P2))              // 대각선 밖 두 꼭짓점
        for (const O of others) {
          const V = []
          for (const [x, z] of [K1, K2, O]) V.push([x, S.lintBot(x, z), z], [x, S.lintTop(x, z), z])
          //  V: [K1b,K1t, K2b,K2t, Ob,Ot] — 밑삼각·윗삼각·옆쿼드 셋
          solid(`상인방${++li}`, V, [[0,2,4],[1,5,3],[0,1,3,2],[2,3,5,4],[4,5,1,0]])
        }
      }
    }
  }
  return parts
}

export function buildBridgeTrapParts() {
  if (!BRD_TRP_ON) return null
  const A = bridgeTrapSpec()
  //  ⚠옆면을 x로 분할한다(≈4 단위): 정본 프로브가 거대 삼각형을 근평면에서 통째로 떨어뜨리는
  //   한계(★148에서 선언) 때문에 122.8짜리 쿼드 하나면 내부 시점에서 벽이 사라져 보인다.
  //   분할해도 프리즘 부피 정확식·에지 감사는 그대로다(전 옆면이 같은 스테이션 공유).
  const NX = Math.ceil(A.len / 4)
  const xs = []
  for (let i = 0; i <= NX; i++) xs.push(A.x0 + A.len * i / NX)
  const solid = []
  for (const s of A.secs) {
    if (s.id === '빗면') { solid.push({ id: '빗면', geo: buildTrapSlope() }); continue }   // ★150-b 조립체
    //  ⚠**quadGeoRaw + 조각별 감김 자기 보증**: 꺾임 분할이 조각 사이에 맞닿은 내부면을 만들고,
    //   `orientOutward`는 그것을 용접해 방향을 뒤집는다(팬텀 66832 실측 — ★149·★150-b에 이은 세 번째).
    const endX = trapSecEndX(s.id)          // ★★★161: 갓 부재만 드럼 천장 면으로 끊는다
    const geo = quadGeoRaw((q, tri) => {
      const put = (Q0) => {
        for (const Q of splitAtKinks(Q0)) {
          const n = Q.length
          const xe = Q.map(([z, y]) => endX(y, z))
          const P = (i, x) => [x, Q[i][1], Q[i][0]]
          //  조각 중심(감김 판정 기준)
          const ctr = [0, 0, 0]
          let cnt = 0
          for (let i = 0; i < n; i++) for (const x of [A.x0, xe[i]]) {
            const v = P(i, x); ctr[0] += v[0]; ctr[1] += v[1]; ctr[2] += v[2]; cnt++
          }
          for (let k = 0; k < 3; k++) ctr[k] /= cnt
          const emit = (pts) => {
            const [a, b, c] = pts
            const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
            const nr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
            let fc = [0, 0, 0]
            for (const v of pts) for (let k = 0; k < 3; k++) fc[k] += v[k] / pts.length
            const d = nr[0] * (fc[0] - ctr[0]) + nr[1] * (fc[1] - ctr[1]) + nr[2] * (fc[2] - ctr[2])
            const o = d >= 0 ? pts : pts.slice().reverse()
            o.length === 3 ? tri(o[0], o[1], o[2]) : q(o[0], o[1], o[2], o[3])
          }
          for (let i = 1; i + 1 < n; i++) emit([P(0, A.x0), P(i, A.x0), P(i + 1, A.x0)])       // 서 캡
          for (let i = 1; i + 1 < n; i++) emit([P(0, xe[0]), P(i, xe[i]), P(i + 1, xe[i + 1])]) // 동 캡
          for (let i = 0; i < n; i++) {                                                        // 옆면
            const j = (i + 1) % n
            for (let k = 0; k < NX; k++) {
              const t0 = k / NX, t1 = (k + 1) / NX
              const xi0 = A.x0 + (xe[i] - A.x0) * t0, xi1 = A.x0 + (xe[i] - A.x0) * t1
              const xj0 = A.x0 + (xe[j] - A.x0) * t0, xj1 = A.x0 + (xe[j] - A.x0) * t1
              emit([P(i, xi0), P(j, xj0), P(j, xj1), P(i, xi1)])
            }
          }
        }
      }
      put(s.quad)
      if (s.mirror) put(s.quad.map(([z, y]) => [-z, y]))
    })
    solid.push({ id: s.id, geo })
  }
  //  ★158 동단 빗면 마개
  const endCap = buildTrapEndCap(A)
  if (endCap) solid.push(endCap)
  //  ★155 관 내부 기둥
  const cols = buildTrapColumns(A)
  if (cols) for (const p of cols) solid.push(p)
  //  ★151 서단 연장체(면추종 절단) — 대역 ⓚ′를 대체한다
  const wc = buildTrapWestCap(A)
  if (wc) for (const p of wc) solid.push(p)
  //  서단 입 덮개 = 첨탑 대역 ⓚ′(bridgeVaultGeometry 정본 재사용 — y1은 BRD_ROOF_TOP 파생으로 자동 148.566)
  if (BRD_BAND_ON) {
    const band = buildSpireBand(bridgeVaultSpec())
    if (band) solid.push({ id: '첨탑대역', geo: band })
  }
  solid.push(...buildTrapPortal())                 // ★★★165 빛구멍 문틀
  solid.push(...buildSlitLink())                   // ★★★166 슬릿 잇기
  return { spec: bridgeTrapSpec(), solid }
}
