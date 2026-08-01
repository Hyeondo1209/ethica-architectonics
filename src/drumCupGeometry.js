// drumCupGeometry.js — ★92 드럼 하판 = 반구 + 감싸는 기둥 (2026.07.31 현도 스케치)
//  ★87 임시 원판(r128, 드럼 벽 84보다 44 밖으로 삐져나옴)의 대체. 현도 지시 3항:
//   ① 삐져나온 임시 원판을 없앤다 ② 그 자리에 **기존 바닥 반지름보다 작은 반구**를 붙인다
//   ③ 반구를 감싸는 **기둥**을 세운다(벽 밑동 출발 → 아래 극점에서 만남).
//  ⚠바닥은 **없다**(현도 2026.07.31: "우선 없게 하고 나중에 내부 인테리어는 손볼거야").
//   그 귀결로 드럼 단지 접지 25기가 전부 받침을 잃는다 = **선언된 빚**(check_render §접지).
//
//  ★★기하가 정한 것 셋(노브 아님):
//   ⓐ **반구 상한 = 78, 84가 아니다.** 리브 #0의 관 중심이 정확히 드럼 벽 위(축에서 84)에 있고
//     관 반경이 6이라 안쪽면이 78이다. 미러 하반부에서 리브 반경은 y −120까지 288 그대로라
//     내려가도 안 비껴 준다. 현도 확정값 R = COR_R × 3/4 = 63 → 여유 15.
//   ⓑ **기둥 호는 파생이다.** 현도가 준 두 끝점(벽 밑동 r84·y0 / 극점 r0·y−R)을 지나면서
//     중심이 축 위에 있는 원은 **하나뿐**: 중심 (0, (W²−R²)/2R) · 반경 그 + R.
//     선물이 딸려왔다 — 이 호는 **극점에서만 반구에 접하고** 나머지 전 구간에서 밖에 있다
//     (벌어짐 21 → 13.3 → 6.5 → 1.7 → 0). 파고들지도 붕 뜨지도 않는다(★91 구 띠 적도 접선과 같은 종류).
//   ⓒ **기둥 반폭은 취향이 아니라 제약의 귀결이다.** 창(±43°) 안에 들어가는 기둥 수 실측:
//     반폭 7(피어와 같음)·6·5 → **0기** / 반폭 4 → **2기** / 3 → 2기. 리브 #0·#±1·#±2가 막는다.
//     따라서 4. 이보다 굵히면 창 쪽은 통째로 비고, 얇히면 §2-C 리브 어휘(얇음·배열)로 미끄러진다.
//
//  ★두 체제(현도 "둘다 구현해보자"):
//   'ring' = ⓐ 균등 링 N기(피어와의 일치는 포기 — 8기를 전부 품는 균등 링은 N=72뿐이고 72는 리브 수다)
//   'pier' = ⓒ 피어 8기 + 창 쪽 110° 갭을 균등 분할해 채움
//  ⚠두 체제 모두 **리브에 막히는 후보는 자동 탈락**한다. 수동 제외 목록 금지 —
//   반경·폭·위상을 돌리면 탈락 목록이 따라 움직여야 한다(★91 문 12곳과 같은 규율).
import * as THREE from 'three'
import {
  COR_R, COR_CX, MERIDIANS, SHELL_RIB_R, H, rOf, CUP_ON,
  PIER_ON, PIER_HW, PIER_DEPTH, PIER_OUT, PIER_Y0, PIER_STEP_ON, PIER_STEP_N, PIER_STEP_H, PIER_STEP_OUT_END,
  PIER_JOIN_MODE, CUP_LOFT_TOP, CUP_LOFT_H, CUP_LOFT_BITE,
  CUP_HAUNCH_ON, CUP_HAUNCH_ANG, CUP_HAUNCH_BITE,
  PIER_TOP_OVER, ceilY,
  CUP_R, CUP_SEG, CUP_LAT,
  CUP_STRAP_MODE, CUP_STRAP_N, CUP_STRAP_PHASE, CUP_FILL_N,
  CUP_STRAP_HW, CUP_STRAP_BITE, CUP_STRAP_CLR, CUP_STRAP_SEG,
  CUP_RING_ON, CUP_RING_T, COR_WALL_SEG,
} from './constants.js'
import { drumPierAzimuths } from './corridorStairsGeometry.js'

const TAU = Math.PI * 2
const norm = (a) => ((a % TAU) + TAU) % TAU

// ── 기둥 호 — 두 끝점에서 파생(위 ⓑ) ──
//  ★호의 출발 반경 — 판은 두께가 있어 **모서리**가 중심선보다 밖에 선다(모서리 평면반경 = √(r²+HW²)).
//   현도 2차 지시 ⓑ("위에서 봤을 때 튀어나온 부분이 안 보이게") = 그 **모서리**가 드럼 바닥 84를 넘지
//   않아야 한다 → 중심선 출발 반경을 √(84² − HW²)로 파생시킨다(HW 4 → 83.905). 클램프가 아니라 파생이라
//   호에 꺾임이 안 생긴다(꺾이면 바깥 면 법선이 틀어져 ★57 계열 버그가 된다 — 1차 구현이 그렇게 났다).
export const strapStartR = () => Math.sqrt(Math.max(0, COR_R * COR_R - CUP_STRAP_HW * CUP_STRAP_HW))
export function strapArc() {
  const R = CUP_R, W = strapStartR()
  const cy = (W * W - R * R) / (2 * R)      // 호 중심 높이 (63·83.905 → 24.365)
  return { cy, ar: cy + R, p0: Math.atan2(-cy, W), p1: -Math.PI / 2 }
}
//  t 0(벽 밑동) → 1(극점). n = 호의 바깥 법선((r,y) 평면 — 참고용).
//  ★★2026.07.31 현도 2차 정정: **호와 반구 사이를 꽉 채운다.** 1차는 기둥을 호 **바깥으로** 3 키웠는데
//   ⓐ 돔과 기둥 사이에 초승달 빈틈이 남았고 ⓑ 꼭대기에서 반경이 84+2.9 = **드럼 바닥보다 튀어나왔다**.
//   → 단면을 **반구면에서 호까지의 반경 구간**으로 바꾼다(구 중심에서의 광선 위). 그러면 둘 다 파생으로 풀린다:
//   · 빈틈 = 그 구간 자체이므로 **정의상 0**
//   · 기둥 바깥 반경 = 호의 반경 ≤ **84**(t=0에서만 84, 이후 단조 감소) = 위에서 봐도 벽 밖으로 안 나온다
//   · 깊이 = ρ(t) − R: 꼭대기 21 → 극점 0 (노브가 아니라 파생)
//   ⚠**BITE**: 안쪽 끝을 반구면보다 조금 **더 안으로** 넣는다. 정확히 반구면에 두면 두 면이 동일 평면이 되어
//    z-파이팅(폭 사슬과 같은 버그 계열)이 난다.
export function strapPoint(t) {
  const { cy, ar, p0, p1 } = strapArc()
  const p = p0 + (p1 - p0) * t
  return { r: ar * Math.cos(p), y: cy + ar * Math.sin(p), nr: Math.cos(p), ny: Math.sin(p) }
}
//  ★단면 정본 — 구 중심(드럼축·y0)에서의 광선 위, 반구면 안쪽(BITE)부터 호까지.
//   반환: u = 그 광선의 단위벡터((r,y) 평면) · rIn/yIn = 안쪽 끝 · rOut/yOut = 바깥 끝(= 호) · depth.
//  ★★92-c: `loft`가 참이면 상단에서 단면을 피어 쪽으로 벌린다(바깥 끝·접선 폭만 — 안쪽 끝은 반구에 붙은 채).
export const loftOn = () => PIER_JOIN_MODE === 'loft' && CUP_ON && PIER_ON
//  ★피어 밑동 y — 'loft'에선 로프트 꼭대기보다 0.5 위로 올라간다(= 그만큼 피어가 깎인다. 현도 2026.07.31 ①).
//   0.5는 ★53이 CSG 닫힘을 위해 쓰던 매몰량 그대로 — 로프트 목 안에 묻힌다.
export const pierBottomY = () => (loftOn() ? CUP_LOFT_TOP - 0.5 : PIER_Y0 - 0.5)
//  ★로프트 섞임 계수: 0 = 피어 단면 그대로 · 1 = 정상 기둥 단면. 목(y>0)과 호(y≤0)가 같은 식을 쓴다.
export const loftBlend = (y) => Math.min(1, Math.max(0, (CUP_LOFT_TOP - y) / CUP_LOFT_H))
//  ★★목 단면(y 0 ~ CUP_LOFT_TOP) — 로프트가 y=0 위로 뻗은 부분. 현도 ①+③이 여기서 만난다:
//   바깥·접선은 로프트 계수로 벌어지고, **안쪽은 피어 안쪽 면(75+BITE)에서 반구 적도(62.5)까지
//   선형으로 내려온다 = 홀 안에서 보이는 사다리꼴 경사면(헌치).** 살을 **더하는** 것이라 공동이 안 생긴다.
export function neckSection(y) {
  const g = loftBlend(y), u = CUP_LOFT_TOP > 0 ? Math.min(1, Math.max(0, y / CUP_LOFT_TOP)) : 0
  const rNorm = strapPoint(0).r
  const rinBowl = CUP_R - CUP_STRAP_BITE
  return {
    y,
    rIn: rinBowl + (COR_R - PIER_DEPTH + CUP_LOFT_BITE - rinBowl) * u,
    rOut: rNorm + (COR_R + PIER_OUT - CUP_LOFT_BITE - rNorm) * (1 - g),
    hw: CUP_STRAP_HW + (PIER_HW - CUP_LOFT_BITE - CUP_STRAP_HW) * (1 - g),
  }
}
export function strapSection(t, loft = false) {
  const q = strapPoint(t), rho = Math.hypot(q.r, q.y) || 1
  const ur = q.r / rho, uy = q.y / rho, rin = CUP_R - CUP_STRAP_BITE
  //  ★법선 둘이 서로 다르다 — 안쪽 경계는 **구면**이라 법선이 u(반경 방향)이고,
  //   바깥 경계는 **호**라 법선이 (nr, ny)다. 1차 구현이 바깥에도 u를 선언해 최대 17.7° 틀어졌다.
  //  ★로프트: y 0 → −CUP_LOFT_H 사이에서 (피어 단면 − BITE) → 정상 단면. 아래로 갈수록 줄기만 한다
  //   = 위에서 보면 피어 그림자 안에 완전히 숨는다.
  let rOut = q.r, hw = CUP_STRAP_HW
  if (loft && loftOn()) {
    const g = loftBlend(q.y)                                       // 0 = 꼭대기 · 1 = 로프트 끝
    rOut = q.r + (COR_R + PIER_OUT - CUP_LOFT_BITE - q.r) * (1 - g)
    hw = CUP_STRAP_HW + (PIER_HW - CUP_LOFT_BITE - CUP_STRAP_HW) * (1 - g)
  }
  return { ur, uy, rho, depth: rho - rin, nr: q.nr, ny: q.ny, hw,
    rIn: ur * rin, yIn: uy * rin, rOut, yOut: q.y }
}

// ── 드럼 근처 리브(월드 방위 보존 — 높이마다 반경을 다시 잰다) ──
export function nearRibs(maxD = 170) {
  const out = []
  for (let k = 0; k < MERIDIANS; k++) {
    const phi = TAU * k / MERIDIANS, r0 = rOf(0)
    const d = Math.hypot(r0 * Math.cos(phi) - COR_CX, r0 * Math.sin(phi))
    if (d < maxD) out.push({ k, phi })
  }
  return out
}
//  ★모서리로 잰다, 면으로 재지 말고(★91 교훈). 단면 네 모서리 × 호 전 구간 × 근접 리브.
//  반환 = 여유(관 반경 + 여유값을 이미 뺀 값). 음수면 그 방위엔 기둥을 못 세운다.
export function strapClearance(az, hw = CUP_STRAP_HW, loft = false) {
  const ribs = nearRibs(), ca = Math.cos(az), sa = Math.sin(az)
  let m = Infinity
  const secs = []
  if (loft && loftOn() && CUP_LOFT_TOP > 0)               // ★목 구간도 잰다(반경이 여기서 가장 크다)
    for (let i = 0; i <= 8; i++) { const y = CUP_LOFT_TOP * (1 - i / 8), n0 = neckSection(y)
      secs.push({ rIn: n0.rIn, yIn: y, rOut: n0.rOut, yOut: y, hw: n0.hw }) }
  for (let i = 0; i <= CUP_STRAP_SEG; i++) secs.push(strapSection(i / CUP_STRAP_SEG, loft))
  for (const S of secs) {
    const w = loft ? Math.max(hw, S.hw) : hw               // 로프트면 벌어진 폭으로 잰다
    for (const e of [0, 1]) {                             // 안쪽 끝 / 바깥 끝(= 호 또는 로프트 끝)
      const r = e ? S.rOut : S.rIn, y = e ? S.yOut : S.yIn
      const rr = rOf(Math.abs(y) / H)                     // 그 높이에서의 리브 반경
      for (const t of [-1, 1]) {
        const x = COR_CX + r * ca - t * w * sa
        const z = r * sa + t * w * ca
        for (const rb of ribs)
          m = Math.min(m, Math.hypot(x - rr * Math.cos(rb.phi), z - rr * Math.sin(rb.phi)))
      }
    }
  }
  return m - SHELL_RIB_R - CUP_STRAP_CLR
}

// ── 후보 방위(두 체제) ──
export function strapCandidates() {
  const out = []
  if (CUP_STRAP_MODE === 'pier') {
    const piers = drumPierAzimuths().map(norm).sort((a, b) => a - b)
    for (const a of piers) out.push({ az: a, src: 'pier' })
    const a0 = piers[piers.length - 1], a1 = piers[0] + TAU     // 창 쪽 갭(110°)
    for (let k = 1; k < CUP_FILL_N; k++) out.push({ az: norm(a0 + (a1 - a0) * k / CUP_FILL_N), src: 'fill' })
  } else {
    for (let i = 0; i < CUP_STRAP_N; i++)
      out.push({ az: norm(CUP_STRAP_PHASE * Math.PI / 180 + i * TAU / CUP_STRAP_N), src: 'ring' })
  }
  //  ★로프트는 **피어 자리에만** 건다(실측: 벌린 단면이 채움 자리에선 리브를 −5.4로 관통한다).
  return out.map((c) => { const lf = loftOn() && c.src === 'pier'
    return { ...c, loft: lf, clr: strapClearance(c.az, CUP_STRAP_HW, lf) } }).sort((u, v) => u.az - v.az)
}
export const liveStraps = () => strapCandidates().filter((c) => c.clr >= 0)

//  ★★92-b 피어 밑동 계단 — **정본 하나.** `Corridor.jsx`(생성)와 `check_corridor`(검증)가 같은 걸 부른다.
//   끝 단면(맨 아래 단)은 노브가 아니라 하판에서 파생된다: 바깥 = 호 출발 반경 · 반폭 = 기둥 반폭.
//   따라서 `CUP_STRAP_HW`나 반구 반경을 돌리면 계단이 저절로 따라온다(사본을 두면 안 따라온다).
export function pierStepSpec() {
  if (!PIER_ON || !PIER_STEP_ON || !CUP_ON || PIER_JOIN_MODE !== 'step') return null   // ★'loft'에선 안 깎는다
  const rOutFull = COR_R + PIER_OUT, rIn = COR_R - PIER_DEPTH
  //  ★바깥 끝 = **벽 기준**(노브 PIER_STEP_OUT_END) · 접선 끝 = **하판 기준**(파생). 둘의 출처가 다르다 —
  //   톱니는 y=0에서 벽과 함께 끝나고, 폭은 y<0의 기둥과 실제로 만난다. 2026.07.31 정정.
  const rEnd = PIER_STEP_OUT_END, hwEnd = CUP_STRAP_HW, yBase = PIER_Y0 - 0.5
  const levels = []
  for (let i = 0; i < PIER_STEP_N; i++) {
    const f = i / PIER_STEP_N
    levels.push({
      y0: yBase + PIER_STEP_H * i, y1: yBase + PIER_STEP_H * (i + 1),
      rOut: rEnd + (rOutFull - rEnd) * f, hw: hwEnd + (PIER_HW - hwEnd) * f,
    })
  }
  return { rIn, rOutFull, rEnd, hwEnd, yBase, top: yBase + PIER_STEP_H * PIER_STEP_N, levels }
}

//  ★★92-b 피어 몸(계단 밑동 포함) — **정본 하나.** `Corridor.jsx`가 그리고 `check_corridor`가 잰다.
//   반환 = 삼각형 평면 배열(비인덱스). 관문 CSG는 호출부에서 이 몸에 뺀다.
export function pierBodyTris(th) {
  const c = Math.cos(th), sn = Math.sin(th)
  const rOut = COR_R + PIER_OUT, rIn = COR_R - PIER_DEPTH
  const corner = (r, w) => {
    const X = COR_CX + r * c - w * sn, Z = r * sn + w * c
    return { X, Z, topY: ceilY(X) + PIER_TOP_OVER }
  }
  //  ★★★92-b 계단 밑동(2026.07.31 현도) — 몸을 **층으로 쌓아** 짓는다. 층 목록의 정본은
  //   `pierStepSpec()`(하판에서 파생 — 여기서 수치를 다시 쓰지 않는다). 계단이 없으면 층은 하나다.
  //   ⚠**여기서 `outwardTris`를 쓰면 안 된다**: 그건 무게중심에서 바깥을 향하게 뒤집는데, 깎여 들어간
  //    계단 옆면은 무게중심보다 **안쪽**이라 정반대로 뒤집힌다. 대신 면마다 **의도한 법선을 명시**한다.
  const flat = []
  const P3 = (r, w, y) => { const cn = corner(r, w); return [cn.X, y, cn.Z] }
  const topOf = (r, w) => corner(r, w).topY
  const eR = [c, 0, sn], eT = [-sn, 0, c]
  const nv = (v) => [-v[0], -v[1], -v[2]]
  const quad = (p0, p1, p2, p3, n) => {
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]
    const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0) flat.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3)
    else flat.push(...p0, ...p2, ...p1, ...p0, ...p3, ...p2)
  }
  const st = pierStepSpec()
  const lv = [...(st ? st.levels : []),
    { y0: st ? st.top : pierBottomY(), y1: null, rOut, hw: PIER_HW }]   // ★'loft'면 밑동이 올라간다(피어가 깎인다)
  for (let i = 0; i < lv.length; i++) {
    const L = lv[i], yb = L.y0, rO = L.rOut, hw = L.hw
    const Y = (r, w) => (L.y1 !== null ? L.y1 : topOf(r, w))            // 빗면 추종은 맨 위 층만
    quad(P3(rIn, -hw, yb), P3(rO, -hw, yb), P3(rO, -hw, Y(rO, -hw)), P3(rIn, -hw, Y(rIn, -hw)), nv(eT))
    quad(P3(rO, -hw, yb), P3(rO, hw, yb), P3(rO, hw, Y(rO, hw)), P3(rO, -hw, Y(rO, -hw)), eR)
    quad(P3(rO, hw, yb), P3(rIn, hw, yb), P3(rIn, hw, Y(rIn, hw)), P3(rO, hw, Y(rO, hw)), eT)
    quad(P3(rIn, hw, yb), P3(rIn, -hw, yb), P3(rIn, -hw, Y(rIn, -hw)), P3(rIn, hw, Y(rIn, hw)), nv(eR))
    if (i === 0)                                                        // ★53 바닥면(CSG 닫힘에 필요)
      quad(P3(rIn, -hw, yb), P3(rO, -hw, yb), P3(rO, hw, yb), P3(rIn, hw, yb), [0, -1, 0])
    if (i === lv.length - 1)                                            // 상단 빗면
      quad(P3(rO, -hw, Y(rO, -hw)), P3(rO, hw, Y(rO, hw)), P3(rIn, hw, Y(rIn, hw)), P3(rIn, -hw, Y(rIn, -hw)), [0, 1, 0])
    else {                                                              // ★디딤 밑면(= 위 층이 더 넓어 생기는 소핏)
      const U = lv[i + 1], yl = L.y1
      quad(P3(rO, -U.hw, yl), P3(U.rOut, -U.hw, yl), P3(U.rOut, U.hw, yl), P3(rO, U.hw, yl), [0, -1, 0])   // 바깥 띠
      quad(P3(rIn, hw, yl), P3(rO, hw, yl), P3(rO, U.hw, yl), P3(rIn, U.hw, yl), [0, -1, 0])               // +접선 띠
      quad(P3(rIn, -U.hw, yl), P3(rO, -U.hw, yl), P3(rO, -hw, yl), P3(rIn, -hw, yl), [0, -1, 0])           // −접선 띠
    }
  }
  return flat
}

//  ★★92-d 헌치 — 홀 안에서 보이는 경사면. 단면 = 직각삼각형(밑변 수평 · 빗변이 경사면 · 바깥면 수직).
//   ⚠피어(r 75~94)와 **반경 구역이 안 겹치는** r 62.5~75.3 에만 선다 — 그래서 피어를 안 올려도 성립한다.
//   높이는 노브가 아니라 **각도에서 파생**된다: 밑변 길이 × tan(각).
export function haunchSpec() {
  if (!CUP_HAUNCH_ON || !loftOn()) return null
  const rOut = COR_R - PIER_DEPTH + CUP_LOFT_BITE          // 75.3 — 피어 안쪽 면 속에 묻힌다
  const y0 = -CUP_HAUNCH_BITE                              // 밑변(기둥 윗면 아래 = 묻힘)
  const rIn0 = Math.sqrt(Math.max(0, (CUP_R - CUP_STRAP_BITE) ** 2 - y0 ** 2))   // 그 높이의 반구면
  const run = rOut - rIn0
  const rise = run * Math.tan(CUP_HAUNCH_ANG * Math.PI / 180)
  return { rIn0, rOut, y0, y1: y0 + rise, run, rise, ang: CUP_HAUNCH_ANG,
    hw: PIER_HW - CUP_LOFT_BITE }
}

export function cupSpec() {
  const cand = strapCandidates(), live = cand.filter((c) => c.clr >= 0)
  return {
    R: CUP_R, cx: COR_CX, arc: strapArc(),
    mode: CUP_STRAP_MODE, cand, live,
    dropped: cand.filter((c) => c.clr < 0),
    minClr: live.length ? Math.min(...live.map((c) => c.clr)) : NaN,
  }
}

// ── 반구 껍질(두께 0 · 법선 명시 = 구 중심 바깥. `computeVertexNormals` 금지 — ★57) ──
export function buildCupBowl() {
  const R = CUP_R, N = CUP_SEG, M = CUP_LAT, pos = [], nrm = []
  const put = (l, a) => {
    const cl = Math.cos(l), sl = Math.sin(l)
    pos.push(COR_CX + R * cl * Math.cos(a), -R * sl, R * cl * Math.sin(a))
    nrm.push(cl * Math.cos(a), -sl, cl * Math.sin(a))
  }
  for (let j = 0; j < M; j++) {
    const l0 = (j / M) * Math.PI / 2, l1 = ((j + 1) / M) * Math.PI / 2
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU
      put(l0, a0); put(l1, a1); put(l1, a0)
      put(l0, a0); put(l0, a1); put(l1, a1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  return g
}

// ── 기둥 = 반구면↔호 사이를 꽉 채운 판(§2-D ② 속 찬 매스) ──
//  ⚠극점에서 N기가 서로 관입한다 = 의도(㊷ 다섯 날 '뿌리 상호 관입' 전례. 매듭 블록은 안 세운다).
//  ⚠극점에서 깊이가 0으로 수렴하므로 마지막 링은 퇴화(면적 0)다 — 감김 검사가 그것을 건너뛴다.
export function buildCupStraps() {
  const live = liveStraps(), S = CUP_STRAP_SEG
  const pos = [], nrm = []
  for (const { az, loft } of live) {
    const ca = Math.cos(az), sa = Math.sin(az)
    //  모서리 넷: 0 = (안,−) · 1 = (밖,−) · 2 = (밖,+) · 3 = (안,+). 폭은 링마다 다를 수 있다(로프트).
    const rings = []
    const mk = (rIn, yIn, rOut, yOut, hw, sc) => {
      const P = (out, t) => [COR_CX + (out ? rOut : rIn) * ca - t * hw * sa,
        out ? yOut : yIn, (out ? rOut : rIn) * sa + t * hw * ca]
      rings.push({ sc, c: [P(0, -1), P(1, -1), P(1, 1), P(0, 1)] })
    }
    if (loft && loftOn() && CUP_LOFT_TOP > 0) {                  // ★목 — 안쪽 면이 사다리꼴 경사면(헌치)
      for (let i = 0; i <= 8; i++) {
        const y = CUP_LOFT_TOP * (1 - i / 8), n0 = neckSection(y)
        mk(n0.rIn, y, n0.rOut, y, n0.hw, { ur: 1, uy: 0, nr: 1, ny: 0 })
      }
    }
    for (let i = 0; i <= S; i++) {
      const sc = strapSection(i / S, loft)
      mk(sc.rIn, sc.yIn, sc.rOut, sc.yOut, sc.hw, sc)
    }
    //  ★★법선은 **삼각형 기하에서 정확히 뽑고**, 넘겨준 힌트는 **부호(어느 쪽이 바깥인가)만** 정한다.
    //   ⚠★92-c 로프트로 반폭이 스윕을 따라 변하면서 옆면이 기울었는데, 상수 ±e_t를 선언해 두었더니
    //    최대 0.85(≈32°)까지 어긋났다. 경계마다 곡면이 다르면 법선을 손으로 쓰지 말고 기하에서 뽑을 것.
    //   퇴화 삼각형(극점 수렴)은 여기서 버려진다 — 넓이 0이라 선언할 법선이 없다.
    const tri = (a, b, c, hint) => {
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
      const L = Math.hypot(n[0], n[1], n[2])
      if (L < 1e-9) return
      n = [n[0] / L, n[1] / L, n[2] / L]
      let v = [a, b, c]
      if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { n = [-n[0], -n[1], -n[2]]; v = [a, c, b] }
      for (const p of v) { pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]) }
    }
    for (let i = 0; i < S; i++) {
      const A = rings[i], B = rings[i + 1], u = A.sc
      const nIn = [-u.ur * ca, -u.uy, -u.ur * sa]        // 안쪽 끝(반구 속에 묻힌다) — 힌트
      const nOut = [u.nr * ca, u.ny, u.nr * sa]          // 바깥 끝(호 또는 로프트) — 힌트
      const nT0 = [sa, 0, -ca], nT1 = [-sa, 0, ca]       // 접선 두 옆면(판의 넓은 면) — 힌트
      const face = (p, q, n) => { tri(A.c[p], B.c[q], B.c[p], n); tri(A.c[p], A.c[q], B.c[q], n) }
      face(3, 0, nIn); face(1, 2, nOut); face(0, 1, nT0); face(2, 3, nT1)
    }
    //  시작 마구리(벽 밑동 · t=0에서 단면이 y=0 수평이라 법선은 위)
    const c0 = rings[0].c                                        // 맨 위 링(목이 있으면 y=TOP)은 수평 → 법선 위
    tri(c0[0], c0[2], c0[1], [0, 1, 0]); tri(c0[0], c0[3], c0[2], [0, 1, 0])
  }
  //  ★★92-d 헌치 — 로프트를 건 기둥(= 피어 자리)마다 하나. 같은 메시에 얹는다.
  const hs = haunchSpec()
  if (hs) for (const { az, loft } of live) {
    if (!loft) continue
    const ca = Math.cos(az), sa = Math.sin(az), HW = hs.hw
    const P = (r, y, t) => [COR_CX + r * ca - t * HW * sa, y, r * sa + t * HW * ca]
    //  단면 세 점: A(안쪽·밑) B(바깥·밑) C(바깥·꼭대기). 빗변 A→C 가 홀에서 보이는 경사면.
    const A = (t) => P(hs.rIn0, hs.y0, t), B = (t) => P(hs.rOut, hs.y0, t), C = (t) => P(hs.rOut, hs.y1, t)
    const nSlope = [(hs.rise * ca) / Math.hypot(hs.rise, hs.run), -hs.run / Math.hypot(hs.rise, hs.run),
      (hs.rise * sa) / Math.hypot(hs.rise, hs.run)]
    const tri2 = (a, b, c, hint) => {
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
      let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
      const L = Math.hypot(n[0], n[1], n[2]); if (L < 1e-9) return
      n = [n[0] / L, n[1] / L, n[2] / L]
      let v = [a, b, c]
      if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { n = [-n[0], -n[1], -n[2]]; v = [a, c, b] }
      for (const p of v) { pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]) }
    }
    const quad2 = (p0, p1, p2, p3, hint) => { tri2(p0, p1, p2, hint); tri2(p0, p2, p3, hint) }
    quad2(A(-1), C(-1), C(1), A(1), nSlope)                    // ★경사면(홀에서 보인다)
    quad2(B(-1), B(1), C(1), C(-1), [ca, 0, sa])               // 바깥 수직면(피어 속에 묻힘)
    quad2(A(-1), A(1), B(1), B(-1), [0, -1, 0])                // 밑면(기둥 속에 묻힘)
    tri2(A(1), B(1), C(1), [-sa, 0, ca])                       // 접선 마구리 둘
    tri2(A(-1), C(-1), B(-1), [sa, 0, -ca])
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  return g
}


// ════════ ★★93 하판 고리판(2026.07.31 현도) — 반구 입 ↔ 드럼 벽 동심 틈을 덮는 수평판 ════════
//  현도 지시: "반구와 드럼 통로 사이의 동심원이 만드는 틈을 완벽하게 가리는 판. 우선 그냥 단순히 수평판으로."
//  ★★안팎이 둘 다 **파생**이다(근거 전문 = constants CUP_RING 블록):
//   · 바깥 rOut = COR_R(84) · 분할 = COR_WALL_SEG(96) · 위상 = i/N·2π  → 드럼 벽과 **정점 공유**.
//     벽 밑선은 96정점 전수 실측 y = 0 평탄이므로 상면(y 0)이 벽 밑동과 정확히 맞물린다(틈 0 · 돌출 0).
//   · 안쪽 rIn = CUP_R − CUP_STRAP_BITE(62.5) = 기둥·헌치의 안쪽 끝과 **같은 값**. 반구면(63~62.982)보다
//     항상 안쪽이라 근-동일 평면이 안 생긴다.
//  ★법선은 **면 기하에서 뽑고 힌트는 부호만** 정한다(★92에서 같은 계열로 두 번 터진 뒤 세워진 규율).
export function ringSpec() {
  return {
    on: CUP_ON && CUP_RING_ON,
    N: COR_WALL_SEG,
    rOut: COR_R,                      // 외접반경 — 벽과 동일(파생)
    rIn: CUP_R - CUP_STRAP_BITE,      // 기둥 안쪽 끝과 동일(파생)
    yTop: 0,                          // 벽 기립선 = 바닥 레벨
    yBot: -CUP_RING_T,
    t: CUP_RING_T,
  }
}

export function buildCupRing() {
  const S = ringSpec()
  if (!S.on) return null
  const { N, rOut, rIn, yTop, yBot } = S
  const pos = [], nrm = []
  const P = (t, r, y) => [COR_CX + r * Math.cos(t), y, r * Math.sin(t)]
  //  ★법선 = 세 점의 외적(정확) · hint = 어느 쪽이 바깥인지 부호만
  const tri = (a, b, c, hint) => {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    const L = Math.hypot(n[0], n[1], n[2]); if (L < 1e-9) return
    n = [n[0] / L, n[1] / L, n[2] / L]
    let v = [a, b, c]
    if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) { n = [-n[0], -n[1], -n[2]]; v = [a, c, b] }
    for (const p of v) { pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]) }
  }
  const quad = (a, b, c, d, hint) => { tri(a, b, c, hint); tri(a, c, d, hint) }

  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * TAU, t1 = ((i + 1) / N) * TAU
    const tm = (t0 + t1) / 2
    const outR = [Math.cos(tm), 0, Math.sin(tm)]                 // 이 면의 바깥 방향(패싯 중앙)
    const inR = [-outR[0], 0, -outR[2]]
    const A = P(t0, rOut, yTop), B = P(t1, rOut, yTop)
    const C = P(t1, rIn, yTop), D = P(t0, rIn, yTop)
    const a = P(t0, rOut, yBot), b = P(t1, rOut, yBot)
    const c = P(t1, rIn, yBot), d = P(t0, rIn, yBot)
    quad(A, B, C, D, [0, 1, 0])        // 상면(홀에서 내려다보는 바닥)
    quad(a, d, c, b, [0, -1, 0])       // 밑면(밖·아래에서 보인다)
    quad(A, a, b, B, outR)             // 바깥 띠 — 벽 밑동 아래 테두리
    quad(D, C, c, d, inR)              // 안쪽 띠 — 사발 아가리 테두리
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3))
  return g
}
